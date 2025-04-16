import asyncio
from pathlib import Path

from azure.identity.aio import AzureDeveloperCliCredential
from azure.storage.filedatalake.aio import FileSystemClient

AZURE_USERSTORAGE_ACCOUNT = "gsk42testeuw001"
AZURE_USERSTORAGE_CONTAINER = "user-content"
azure_credential = AzureDeveloperCliCredential(process_timeout=60)
user_blob_container_client = FileSystemClient(
    f"https://{AZURE_USERSTORAGE_ACCOUNT}.dfs.core.windows.net",
    AZURE_USERSTORAGE_CONTAINER,
    credential=azure_credential,
)
user_oid = "e5b9ef54-b062-4505-9fd5-e7ae95c132f1"
chat_id = "959746c3-2b44-4f9d-b1f9-bf82dd4f8a16"
user_directory_client = user_blob_container_client.get_directory_client(user_oid)
sub_dir = user_directory_client.get_sub_directory_client(chat_id)
user_blob_container_client.get_paths(path=user_oid)


async def list_p():
    user_blob_container_client = FileSystemClient(
        f"https://{AZURE_USERSTORAGE_ACCOUNT}.dfs.core.windows.net",
        AZURE_USERSTORAGE_CONTAINER,
        credential=azure_credential,
    )
    async for path in user_blob_container_client.get_paths(path=f"{user_oid}/{chat_id}"):
        print(path.name)
        print(type(path))
        print(Path(path.name).name)


asyncio.run(list_p())


async def make_subdir():
    await sub_dir.create_directory()
    await sub_dir.set_access_control(owner=user_oid)


asyncio.run(make_subdir())

file_client = user_directory_client.get_file_client("/home/steveahlswede/repos/intern/chat-gsk42/LICENSE")


async def upload_file():
    await sub_dir.set_access_control(owner=user_oid)


asyncio.run(upload_file())

from azure.identity import AzureDeveloperCliCredential
from azure.search.documents import SearchClient

AZURE_SEARCH_SERVICE = "gptkb-xs6owhwiahpe2"
endpoint = f"https://{AZURE_SEARCH_SERVICE}.search.windows.net/"
azure_credential = AzureDeveloperCliCredential(process_timeout=60)
AZURE_SEARCH_INDEX = "search-gsk42-test"
index_name = AZURE_SEARCH_INDEX


# search and delete
documents_to_remove = []
search_client = SearchClient(endpoint=endpoint, index_name=index_name, credential=azure_credential)
result = search_client.search(search_text="", top=1045, include_total_count=True)
for document in result:
    documents_to_remove.append({"id": document["id"]})
len(documents_to_remove)
removed_docs = search_client.delete_documents(documents_to_remove)


async def search_and_name_files():
    filenames_found = set()
    search_client = SearchClient(endpoint=endpoint, index_name=index_name, credential=azure_credential)
    result = await search_client.search(search_text="", top=100, include_total_count=True)
    async for document in result:
        filenames_found.add(document["sourcefile"])
    return filenames_found


res = asyncio.run(search_and_name_files())
