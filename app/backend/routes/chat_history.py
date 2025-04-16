import os
from typing import Any

from azure.cosmos.aio import ContainerProxy, CosmosClient
from config import CONFIG_CHAT_HISTORY_CLIENT, CONFIG_OPENAI_CLIENT
from decorators import authenticated
from openai import AsyncAzureOpenAI
from openai.types.chat import ChatCompletion
from quart import Blueprint, current_app, jsonify, request

chat_history_bp = Blueprint("history", __name__)


def get_container() -> ContainerProxy:
    client: CosmosClient = current_app.config[CONFIG_CHAT_HISTORY_CLIENT]
    db_name = os.environ["DATABASE_NAME"]
    container_name = os.environ["CONTAINER_NAME"]
    database_obj = client.get_database_client(db_name)
    container = database_obj.get_container_client(container_name)
    return container


@chat_history_bp.get("/chats")
@authenticated
async def get_chat_history(auth_claims: dict[str, Any]):
    """Gets all of the chat history items for an authenticated user"""
    user_oid = auth_claims["oid"]
    container = get_container()
    query = "SELECT table.id, table.title, table._ts FROM table WHERE table.oid=@oid ORDER BY table._ts DESC"
    response = container.query_items(query=query, parameters=[{"name": "@oid", "value": user_oid}])
    items = [item async for item in response]
    return items


@chat_history_bp.get("/chats/<string:chatid>")
async def get_single_chat_history(chatid: str):
    """Gets the chat history for a single item."""
    container = get_container()
    query = "SELECT table.id, table.answers FROM table WHERE table.id=@id"
    response = container.query_items(query=query, parameters=[{"name": "@id", "value": chatid}])
    items = [item async for item in response]
    return items


@chat_history_bp.delete("/chats/<string:chatid>")
async def delete_single_chat_history(chatid: str):
    """Deletes the chat history for a single item."""
    container = get_container()
    query = "SELECT * FROM table WHERE table.id=@id"
    response = container.query_items(query=query, parameters=[{"name": "@id", "value": chatid}])
    items = [item async for item in response]
    for item in items:
        await container.delete_item(item, item["oid"])
    return jsonify("Chat history deleted"), 200


def get_update_operations(request: dict):
    if request.get("title"):
        operations = [{"op": "replace", "path": "/title", "value": request["title"]}]
    elif request.get("answers"):
        operations = [{"op": "replace", "path": "/answers", "value": request["answers"]}]
    else:
        raise ValueError(
            f"Failed to update chat history, neither title or answers provided in the request body.\nRequest: {request}"
        )
    return operations


@chat_history_bp.put("/chats")
@authenticated
async def update_chat_history(auth_claims: dict[str, Any]):
    """Updates the document for the current user chat"""
    request_json = await request.get_json()
    container = get_container()
    user_oid = auth_claims["oid"]
    request_json["oid"] = user_oid
    # read_item = container.read_item(item=request_json["id"], partition_key=auth_claims["oid"])
    operations = get_update_operations(request_json)
    item = await container.patch_item(
        item=request_json["id"], partition_key=auth_claims["oid"], patch_operations=operations
    )
    output = {"id": item["id"], "title": item["title"], "_ts": item["_ts"]}
    return output


@chat_history_bp.post("/chats")
@authenticated
async def post_chat(auth_claims: dict[str, Any]):
    """Updates the document for the current user chat"""
    request_json = await request.get_json()
    container = get_container()
    user_oid = auth_claims["oid"]
    request_json["oid"] = user_oid
    request_json["title"] = await get_title(request_json["answers"], request_json["id"], container)
    item = await container.upsert_item(body=request_json)
    output = {"id": item["id"], "title": item["title"], "_ts": item["_ts"]}
    return output


async def get_title(message, id, container):
    """Creates a short (2-5 words) title for a new chat being added to the history."""
    query = "SELECT * FROM table WHERE table.id=@id"
    response = container.query_items(query=query, parameters=[{"name": "@id", "value": id}])
    items = [item async for item in response]
    if len(items) > 0:
        title = items[0].get("title", "untitled")
    else:
        openai_client: AsyncAzureOpenAI = current_app.config[CONFIG_OPENAI_CLIENT]
        messages = [
            {
                "role": "system",
                "content": "Please give a very short (2-5 words) summary of this message which can be used as a title. NOTE: Have the language of the title match to the language of the (majority of) words used in the message!",
            },
            {
                "role": "user",
                "content": f"Message: {message}",
            },
        ]
        chat_completion: ChatCompletion = await openai_client.chat.completions.create(
            messages=messages,  # type: ignore
            # Azure OpenAI takes the deployment name as the model name
            model=os.environ["AZURE_OPENAI_CHATGPT_DEPLOYMENT"],
            temperature=0.2,
            n=1,
        )
        title = chat_completion.choices[0].message.content
    return title
