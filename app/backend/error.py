import logging

from openai import APIError
from quart import jsonify

ERROR_MESSAGE = """The app encountered an error processing your request.
If you are an administrator of the app, view the full error in the logs. See aka.ms/appservice-logs for more information.
Error type: {error_type}
"""
ERROR_MESSAGE_FILTER = """Your message contains content that was flagged by the OpenAI content filter."""

ERROR_MESSAGE_LENGTH = """Your message exceeded the context length limit for this OpenAI model. Please shorten your message or change your settings to retrieve fewer search results."""


def error_dict(error: Exception) -> dict:
    if isinstance(error, APIError) and error.code == "content_filter":
        return {"error": ERROR_MESSAGE_FILTER}
    if isinstance(error, APIError) and error.code == "context_length_exceeded":
        return {"error": ERROR_MESSAGE_LENGTH}
    return {"error": ERROR_MESSAGE.format(error_type=type(error))}


def error_response(error: Exception, route: str, status_code: int = 500):
    logging.exception("Exception in %s: %s", route, error)
    if isinstance(error, APIError) and error.code == "content_filter":
        status_code = 400
    return jsonify(error_dict(error)), status_code


def content_filter_error_response(filter_param: str):
    if filter_param == "jailbreak":
        return (
            jsonify(
                {
                    "error": "Ihre Anfrage wurde aufgrund von Jailbreak-Inhalten blockiert. Bitte formulieren Sie die Nachricht um."
                }
            ),
            400,
        )
    elif filter_param == "hate":
        return (
            jsonify(
                {"error": "Ihre Anfrage enthält möglicherweise Hassreden. Bitte formulieren Sie die Nachricht um."}
            ),
            400,
        )
    elif filter_param == "violence":
        return (
            jsonify(
                {
                    "error": "Ihre Anfrage wurde aufgrund von Gewaltinhalten blockiert. Bitte formulieren Sie die Nachricht um."
                }
            ),
            400,
        )
    elif filter_param == "self_harm":
        return (
            jsonify(
                {
                    "error": "Ihre Anfrage wurde aufgrund von Inhalten zur Selbstverletzung blockiert. Bitte formulieren Sie die Nachricht um."
                }
            ),
            400,
        )
    else:
        # Allgemeine Content-Filter-Fehlermeldung, wenn der spezifische Parameter nicht bekannt ist
        return (
            jsonify(
                {"error": "Ihre Anfrage wurde vom Content-Filter blockiert. Bitte formulieren Sie die Nachricht um."}
            ),
            400,
        )
