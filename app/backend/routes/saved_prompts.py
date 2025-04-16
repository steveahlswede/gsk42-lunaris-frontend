import logging
import os
from typing import Any

from config import CONFIG_CHAT_HISTORY_CLIENT
from decorators import authenticated
from quart import Blueprint, current_app, jsonify, request

saved_prompts_bp = Blueprint("prompts", __name__)


@saved_prompts_bp.get("/global_prompts/items")
async def get_global_prompts():
    """Gets all of the globally available prompts."""
    client = current_app.config[CONFIG_CHAT_HISTORY_CLIENT]
    db_name = os.environ["DATABASE_NAME"]
    container_name = os.environ["CONTAINER_NAME_GLOBAL_PROMPTS"]
    database_obj = client.get_database_client(db_name)
    container = database_obj.get_container_client(container_name)
    logging.info("Getting global prompts")
    query = "SELECT * FROM table"
    response = container.query_items(query=query)
    items = [item async for item in response]
    logging.info("Got global prompts")
    return items


@saved_prompts_bp.get("/user_prompts/items")
@authenticated
async def get_user_prompts(auth_claims: dict[str, Any]):
    """Gets all of the user specific prompts."""
    user_oid = auth_claims.get("oid")
    client = current_app.config[CONFIG_CHAT_HISTORY_CLIENT]
    db_name = os.environ["DATABASE_NAME"]
    container_name = os.environ["CONTAINER_NAME_USER_PROMPTS"]
    database_obj = client.get_database_client(db_name)
    container = database_obj.get_container_client(container_name)
    logging.info("Getting user prompts")
    query = "SELECT table.id, table.title, table.prompt FROM table WHERE table.oid=@oid ORDER BY table._ts DESC"
    response = container.query_items(query=query, parameters=[{"name": "@oid", "value": user_oid}])
    items = [item async for item in response]
    return items


@saved_prompts_bp.post("/user_prompts/add")
@authenticated
async def add_user_prompts(auth_claims: dict[str, Any]):
    """Adds a new prompt for the current user"""
    request_json = await request.get_json()
    client = current_app.config[CONFIG_CHAT_HISTORY_CLIENT]
    db_name = os.environ["DATABASE_NAME"]
    container_name = os.environ["CONTAINER_NAME_USER_PROMPTS"]
    database_obj = client.get_database_client(db_name)
    container = database_obj.get_container_client(container_name)
    request_json["oid"] = auth_claims["oid"]
    item = await container.upsert_item(body=request_json)
    return item


@saved_prompts_bp.post("/user_prompts/delete/<string:promptid>")
async def delete_user_prompts(promptid: str):
    """Delete a prompt for the current user"""
    client = current_app.config[CONFIG_CHAT_HISTORY_CLIENT]
    db_name = os.environ["DATABASE_NAME"]
    container_name = os.environ["CONTAINER_NAME_USER_PROMPTS"]
    database_obj = client.get_database_client(db_name)
    container = database_obj.get_container_client(container_name)
    query = "SELECT * FROM table WHERE table.id=@id"
    response = container.query_items(query=query, parameters=[{"name": "@id", "value": promptid}])
    items = [item async for item in response]
    if len(items) == 0:
        return jsonify("Prompt not found"), 404
    for item in items:
        print(f" lfijsailfaslifjilsaj {item}")
        await container.delete_item(item, item["oid"])
    return jsonify("User prompt deleted"), 200
