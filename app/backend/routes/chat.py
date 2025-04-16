import dataclasses
import json
import logging
from typing import Any, AsyncGenerator, Dict

import openai
from approaches.approach import Approach
from config import CONFIG_CHAT_APPROACH, CONFIG_CHAT_VISION_APPROACH, CONFIG_USER_BLOB_CONTAINER_CLIENT
from decorators import authenticated
from error import content_filter_error_response, error_dict, error_response
from models import Overrides
from quart import Blueprint, current_app, jsonify, make_response, request

chat_api_bp = Blueprint("chatapi", __name__)


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)
        return super().default(o)


async def format_as_ndjson(r: AsyncGenerator[dict, None]) -> AsyncGenerator[str, None]:
    try:
        async for event in r:
            yield json.dumps(event, ensure_ascii=False, cls=JSONEncoder) + "\n"
    except Exception as error:
        logging.exception("Exception while generating response stream: %s", error)
        yield json.dumps(error_dict(error))


def get_approach(context: dict) -> Approach:
    overrides = Overrides(**context.get("overrides", {}))
    approach: Approach
    if overrides.use_gpt4v and CONFIG_CHAT_VISION_APPROACH in current_app.config:
        approach: Approach = current_app.config[CONFIG_CHAT_VISION_APPROACH]
    else:
        approach: Approach = current_app.config[CONFIG_CHAT_APPROACH]
    return approach


@chat_api_bp.route("/chat", methods=["POST"])
@authenticated
async def chat(auth_claims: Dict[str, Any]):
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415
    request_json = await request.get_json()
    logging.warning(f"Got request for chat api from user {auth_claims['oid']} : {request_json}")
    context = request_json.get("context", {})
    context["auth_claims"] = auth_claims
    try:
        approach = get_approach(context)
        context[CONFIG_USER_BLOB_CONTAINER_CLIENT] = current_app.config.get(CONFIG_USER_BLOB_CONTAINER_CLIENT)

        # Ausführung der Chat-Anfrage
        logging.warning(f"Sending request for chat api from user {auth_claims['oid']}")
        result = await approach.run(
            request_json["messages"],
            context=context,
            session_state=request_json.get("session_state"),
        )
        logging.warning(f"Got response from chat api for user {auth_claims['oid']}")
        return jsonify(result)
    # Spezifische Behandlung aller Azure Content-Filter Fehler
    except openai.BadRequestError as e:
        error_data = e.error
        logging.warning(f"Content-Filter-Fehler in /chat: {error_data} for user {auth_claims['oid']}")

        # Prüfen, ob der Fehler durch den Content-Filter ausgelöst wurde
        if error_data.get("code") == "content_filter":
            # Detaillierte Behandlung basierend auf dem Filter-Parameter
            filter_param = error_data.get("param")

            return content_filter_error_response(filter_param)

    except Exception as error:
        logging.exception(f"Fehler im /chat Endpunkt: {error}")
        return error_response(error, "/chat")


@chat_api_bp.route("/chat/stream", methods=["POST"])
@authenticated
async def chat_stream(auth_claims: Dict[str, Any]):
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415
    request_json = await request.get_json()
    logging.warning(f"Got request for chat api from user {auth_claims['oid']} : {request_json}")
    context = request_json.get("context", {})
    context["auth_claims"] = auth_claims
    try:
        approach = get_approach(context)
        context[CONFIG_USER_BLOB_CONTAINER_CLIENT] = current_app.config.get(CONFIG_USER_BLOB_CONTAINER_CLIENT)

        # Stream-Ausführung der Chat-Anfrage
        logging.warning(f"Sending request for chat api from user {auth_claims['oid']}")
        result = await approach.run_stream(
            request_json["messages"],
            session_state=request_json.get("session_state"),
            context=context,
        )
        response = await make_response(format_as_ndjson(result))
        logging.warning(f"Got response from chat api for user {auth_claims['oid']}: {response}")
        response.timeout = None  # Deaktivieren des Timeouts für Streaming
        response.mimetype = "application/json-lines"
        return response

    # Spezifische Behandlung aller Azure Content-Filter Fehler
    except openai.BadRequestError as e:
        error_data = e.error
        logging.warning(f"Content-Filter-Fehler in /chat/stream: {error_data} for user {auth_claims['oid']}")

        # Prüfen, ob der Fehler durch den Content-Filter ausgelöst wurde
        if error_data.get("code") == "content_filter":
            # Detaillierte Behandlung basierend auf dem Filter-Parameter
            filter_param = error_data.get("param")

            return content_filter_error_response(filter_param)

    # Generische Fehlerbehandlung für andere Fehler
    except Exception as error:
        logging.exception(f"Fehler im /chat/stream Endpunkt: {error}")
        return error_response(error, "/chat/stream")
