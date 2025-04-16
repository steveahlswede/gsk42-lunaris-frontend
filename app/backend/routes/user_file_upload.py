import io
from pathlib import Path
from typing import Any, Dict, List

from azure.core.exceptions import ResourceNotFoundError
from azure.storage.filedatalake.aio import DataLakeDirectoryClient, FileSystemClient
from config import CONFIG_INGESTER, CONFIG_USER_BLOB_CONTAINER_CLIENT
from decorators import authenticated, authenticated_path
from prepdocslib.filestrategy import UploadUserFileStrategy
from prepdocslib.listfilestrategy import File
from quart import Blueprint, current_app, jsonify, request

user_uploads_bp = Blueprint("uploads", __name__)


@user_uploads_bp.post("/upload")
@authenticated
async def upload(auth_claims: dict[str, Any]):
    form_data = await request.form
    chat_id = form_data["chatId"]
    request_files = await request.files

    if "file" not in request_files:
        # If no files were included in the request, return an error response
        return jsonify({"message": "No file part in the request", "status": "failed"}), 400

    user_oid = auth_claims["oid"]
    file = request_files.getlist("file")[0]
    user_blob_container_client: FileSystemClient = current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT]

    user_directory_client = user_blob_container_client.get_directory_client(user_oid)
    await create_directory_if_not_found(user_directory_client, f"Creating user directory for user {user_oid}")
    await user_directory_client.set_access_control(owner=user_oid)

    chat_sub_dir = user_directory_client.get_sub_directory_client(chat_id)
    await create_directory_if_not_found(chat_sub_dir, f"Creating chat directory for user {user_oid}")
    await chat_sub_dir.set_access_control(owner=user_oid)
    file_client = chat_sub_dir.get_file_client(file.filename)
    file_io = file
    file_io.name = file.filename
    file_io = io.BufferedReader(file_io)
    await file_client.upload_data(file_io, overwrite=True, metadata={"UploadedBy": user_oid})
    file_io.seek(0)
    ingester: UploadUserFileStrategy = current_app.config[CONFIG_INGESTER]
    await ingester.add_file(File(content=file_io, acls={"oids": [user_oid]}, url=file_client.url), chat_id)
    return jsonify({"message": "File uploaded successfully", "filename": file.filename}), 200


async def create_directory_if_not_found(directory_client: DataLakeDirectoryClient, logging_msg: str):
    try:
        await directory_client.get_directory_properties()
    except ResourceNotFoundError:
        current_app.logger.info(logging_msg)
        await directory_client.create_directory()


@user_uploads_bp.delete("/upload")
@authenticated
async def delete_uploaded(auth_claims: dict[str, Any]):
    request_json = await request.get_json()
    filename = request_json.get("filename")
    chat_id = request_json.get("chatId")
    user_oid = auth_claims["oid"]
    user_blob_container_client: FileSystemClient = current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT]
    user_directory_client = user_blob_container_client.get_directory_client(user_oid)
    chat_sub_dir = user_directory_client.get_sub_directory_client(chat_id)
    file_client = chat_sub_dir.get_file_client(filename)
    await file_client.delete_file()
    files_in_chat_folder = [path async for path in user_blob_container_client.get_paths(path=f"{user_oid}/{chat_id}")]
    if not files_in_chat_folder:
        await chat_sub_dir.delete_directory()
    ingester: UploadUserFileStrategy = current_app.config[CONFIG_INGESTER]
    await ingester.remove_file(filename, user_oid)
    return jsonify({"message": f"File {filename} deleted successfully"}), 200


@user_uploads_bp.get("/list_uploaded/<chatid>")
@authenticated
async def list_uploaded_specific_chat(chatid: str, auth_claims: dict[str, Any]):
    user_oid = auth_claims["oid"]
    print(f"{user_oid}/{chatid}")
    user_blob_container_client: FileSystemClient = current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT]
    files = []
    try:
        all_paths = user_blob_container_client.get_paths(path=f"{user_oid}/{chatid}")
        async for filepath in all_paths:
            files.append(Path(filepath.name).name)
    except ResourceNotFoundError as error:
        if error.status_code != 404:
            current_app.logger.exception("Error listing uploaded files", error)
    return jsonify(files), 200


@user_uploads_bp.get("/list_uploaded")
@authenticated
async def list_all_uploaded(auth_claims: dict[str, Any]):
    user_oid = auth_claims["oid"]
    user_blob_container_client: FileSystemClient = current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT]
    files: Dict[str, List[str]] = {}
    try:
        all_paths = user_blob_container_client.get_paths(path=user_oid)
        async for filepath in all_paths:
            chat_id = Path(filepath.name).parent.name
            if chat_id not in files:
                files[chat_id] = []
            files[chat_id].append(Path(filepath.name).name)
    except ResourceNotFoundError as error:
        if error.status_code != 404:
            current_app.logger.exception("Error listing uploaded files", error)
    return jsonify(files), 200
