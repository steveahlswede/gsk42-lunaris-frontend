import asyncio
import io
import logging
import mimetypes
import os
import random
import time
from pathlib import Path
from typing import Any, Dict, List, Union

import httpx
from approaches.chatreadretrieveread import ChatReadRetrieveReadApproach
from approaches.chatreadretrievereadvision import ChatReadRetrieveReadVisionApproach
from azure.cognitiveservices.speech import (
    ResultReason,
    SpeechConfig,
    SpeechSynthesisOutputFormat,
    SpeechSynthesisResult,
    SpeechSynthesizer,
)
from azure.core.exceptions import ResourceNotFoundError
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import AzureDeveloperCliCredential, ManagedIdentityCredential, get_bearer_token_provider
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.storage.blob.aio import ContainerClient
from azure.storage.blob.aio import StorageStreamDownloader as BlobDownloader
from azure.storage.filedatalake.aio import FileSystemClient
from azure.storage.filedatalake.aio import StorageStreamDownloader as DatalakeDownloader
from config import (
    CONFIG_AUTH_CLIENT,
    CONFIG_BLOB_CONTAINER_CLIENT,
    CONFIG_CHAT_APPROACH,
    CONFIG_CHAT_HISTORY_CLIENT,
    CONFIG_CHAT_VISION_APPROACH,
    CONFIG_CREDENTIAL,
    CONFIG_GPT4V_DEPLOYED,
    CONFIG_INGESTER,
    CONFIG_OPENAI_CLIENT,
    CONFIG_SEARCH_CLIENT,
    CONFIG_SEMANTIC_RANKER_DEPLOYED,
    CONFIG_SPEECH_INPUT_ENABLED,
    CONFIG_SPEECH_OUTPUT_AZURE_ENABLED,
    CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED,
    CONFIG_SPEECH_SERVICE_ID,
    CONFIG_SPEECH_SERVICE_LOCATION,
    CONFIG_SPEECH_SERVICE_TOKEN,
    CONFIG_SPEECH_SERVICE_VOICE,
    CONFIG_USER_BLOB_CONTAINER_CLIENT,
    CONFIG_USER_UPLOAD_ENABLED,
    CONFIG_VECTOR_SEARCH_ENABLED,
)
from core.authentication import AuthenticationHelper
from decorators import authenticated_path
from openai import AsyncAzureOpenAI, AsyncOpenAI
from openai_priority_loadbalancer import AsyncLoadBalancer, Backend
from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.openai import OpenAIInstrumentor
from prepdocs import clean_key_if_exists, setup_embeddings_service, setup_file_processors, setup_search_info
from prepdocslib.filestrategy import UploadUserFileStrategy
from quart import Blueprint, Quart, abort, current_app, jsonify, request, send_file, send_from_directory
from quart_cors import cors


class RetryTransport(httpx.AsyncBaseTransport):
    def __init__(
        self,
        transport: httpx.AsyncBaseTransport,
        retries: int = 5,  # Increased to 5 retries
        backoff_factor: float = 1.0,  # Increased backoff factor to 1.0
        status_forcelist: tuple = (500, 502, 503, 504, 429),  # Added 429 for rate limits
    ):
        self.transport = transport
        self.retries = retries
        self.backoff_factor = backoff_factor
        self.status_forcelist = status_forcelist

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        for attempt in range(1, self.retries + 1):
            try:
                response = await self.transport.handle_async_request(request)
                if response.status_code not in self.status_forcelist:
                    return response
                elif attempt == self.retries:
                    logging.error(f"All retries failed. Last status: {response.status_code}")
                    return response
                else:
                    # Calculate backoff with random jitter
                    base_backoff = self.backoff_factor * (2 ** (attempt - 1))
                    jitter = random.uniform(0, 1)  # Adding jitter
                    backoff = base_backoff + jitter
                    logging.warning(
                        f"Request failed with status {response.status_code}, retrying in {backoff:.2f} seconds..."
                    )
                    await asyncio.sleep(backoff)
            except Exception as e:
                if attempt == self.retries:
                    logging.error(f"All retries failed. Error: {e}")
                    raise
                else:
                    base_backoff = self.backoff_factor * (2 ** (attempt - 1))
                    jitter = random.uniform(0, 1)  # Adding jitter
                    backoff = base_backoff + jitter
                    logging.warning(f"Exception occurred: {e}. Retrying in {backoff:.2f} seconds...")
                    await asyncio.sleep(backoff)


bp = Blueprint("routes", __name__, static_folder="static")
# Fix Windows registry issue with mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


@bp.route("/")
async def index():
    return await bp.send_static_file("index.html")


@bp.route("/favicon.ico")
async def favicon():
    return await bp.send_static_file("favicon.ico")


@bp.route("/add-text.svg")
async def add_text():
    return await bp.send_static_file("add-text.svg")


@bp.route("/enter.svg")
async def enter():
    return await bp.send_static_file("enter.svg")


@bp.route("/restart.svg")
async def restart():
    return await bp.send_static_file("restart.svg")


@bp.route("/attachment.svg")
async def attachment():
    return await bp.send_static_file("attachment.svg")


@bp.route("/trash-alt.svg")
async def trash_alt():
    return await bp.send_static_file("trash-alt.svg")


@bp.route("/send2.svg")
async def send2():
    return await bp.send_static_file("send2.svg")


@bp.route("/chat-conversation.svg")
async def chat_conversation():
    return await bp.send_static_file("chat-conversation.svg")


@bp.route("/assets/<path:path>")
async def assets(path):
    return await send_from_directory(Path(__file__).resolve().parent / "static" / "assets", path)


# Empty page is recommended for login redirect to work.
# See https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/initialization.md#redirecturi-considerations for more information
@bp.route("/redirect")
async def redirect():
    return ""


@bp.route("/content/<path>")
@authenticated_path
async def content_file(path: str, auth_claims: Dict[str, Any]):
    """
    Serve content files from blob storage from within the app to keep the example self-contained.
    *** NOTE *** if you are using app services authentication, this route will return unauthorized to all users that are not logged in
    if AZURE_ENFORCE_ACCESS_CONTROL is not set or false, logged in users can access all files regardless of access control
    if AZURE_ENFORCE_ACCESS_CONTROL is set to true, logged in users can only access files they have access to
    This is also slow and memory hungry.
    """
    # Remove page number from path, filename-1.txt -> filename.txt
    # This shouldn't typically be necessary as browsers don't send hash fragments to servers
    if path.find("#page=") > 0:
        path_parts = path.rsplit("#page=", 1)
        path = path_parts[0]
    logging.info("Opening file %s", path)
    blob_container_client: ContainerClient = current_app.config[CONFIG_BLOB_CONTAINER_CLIENT]
    blob: Union[BlobDownloader, DatalakeDownloader]
    try:
        blob = await blob_container_client.get_blob_client(path).download_blob()
    except ResourceNotFoundError:
        logging.info("Path not found in general Blob container: %s", path)
        if current_app.config[CONFIG_USER_UPLOAD_ENABLED]:
            try:
                user_oid = auth_claims["oid"]
                user_blob_container_client = current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT]
                user_directory_client: FileSystemClient = user_blob_container_client.get_directory_client(user_oid)
                file_client = user_directory_client.get_file_client(path)
                blob = await file_client.download_file()
            except ResourceNotFoundError:
                logging.exception("Path not found in DataLake: %s", path)
                abort(404)
        else:
            abort(404)
    if not blob.properties or not blob.properties.has_key("content_settings"):
        abort(404)
    mime_type = blob.properties["content_settings"]["content_type"]
    if mime_type == "application/octet-stream":
        mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    blob_file = io.BytesIO()
    await blob.readinto(blob_file)
    blob_file.seek(0)
    return await send_file(blob_file, mimetype=mime_type, as_attachment=False, attachment_filename=path)


# Send MSAL.js settings to the client UI
@bp.route("/auth_setup", methods=["GET"])
def auth_setup():
    auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
    return jsonify(auth_helper.get_auth_setup_for_client())


@bp.route("/config", methods=["GET"])
def config():
    return jsonify(
        {
            "showGPT4VOptions": current_app.config[CONFIG_GPT4V_DEPLOYED],
            "showSemanticRankerOption": current_app.config[CONFIG_SEMANTIC_RANKER_DEPLOYED],
            "showVectorOption": current_app.config[CONFIG_VECTOR_SEARCH_ENABLED],
            "showUserUpload": current_app.config[CONFIG_USER_UPLOAD_ENABLED],
            "showSpeechInput": current_app.config[CONFIG_SPEECH_INPUT_ENABLED],
            "showSpeechOutputBrowser": current_app.config[CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED],
            "showSpeechOutputAzure": current_app.config[CONFIG_SPEECH_OUTPUT_AZURE_ENABLED],
        }
    )


@bp.route("/speech", methods=["POST"])
async def speech():
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415

    speech_token = current_app.config.get(CONFIG_SPEECH_SERVICE_TOKEN)
    if speech_token is None or speech_token.expires_on < time.time() + 60:
        speech_token = await current_app.config[CONFIG_CREDENTIAL].get_token(
            "https://cognitiveservices.azure.com/.default"
        )
        current_app.config[CONFIG_SPEECH_SERVICE_TOKEN] = speech_token

    request_json = await request.get_json()
    text = request_json["text"]
    try:
        # Construct a token as described in documentation:
        # https://learn.microsoft.com/azure/ai-services/speech-service/how-to-configure-azure-ad-auth?pivots=programming-language-python
        auth_token = (
            "aad#"
            + current_app.config[CONFIG_SPEECH_SERVICE_ID]
            + "#"
            + current_app.config[CONFIG_SPEECH_SERVICE_TOKEN].token
        )
        speech_config = SpeechConfig(auth_token=auth_token, region=current_app.config[CONFIG_SPEECH_SERVICE_LOCATION])
        speech_config.speech_synthesis_voice_name = current_app.config[CONFIG_SPEECH_SERVICE_VOICE]
        speech_config.speech_synthesis_output_format = SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        result: SpeechSynthesisResult = synthesizer.speak_text_async(text).get()
        if result.reason == ResultReason.SynthesizingAudioCompleted:
            return result.audio_data, 200, {"Content-Type": "audio/mp3"}
        elif result.reason == ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            current_app.logger.error(
                "Speech synthesis canceled: %s %s", cancellation_details.reason, cancellation_details.error_details
            )
            raise Exception("Speech synthesis canceled. Check logs for details.")
        else:
            current_app.logger.error("Unexpected result reason: %s", result.reason)
            raise Exception("Speech synthesis failed. Check logs for details.")
    except Exception as e:
        logging.exception("Exception in /speech")
        return jsonify({"error": str(e)}), 500


@bp.get("/admin_user")
def admin_user():
    logging.warning("Getting admin user from FastAPI")
    logging.warning(os.getenv("ADMIN_USERNAME"))
    logging.warning(os.environ.get("ADMIN_USERNAME"))
    logging.warning(f"ALL ENV VARS: {os.environ}")
    return jsonify({"user": os.getenv("ADMIN_USERNAME")}), 200


@bp.before_app_serving
async def setup_clients():
    # Replace these with your own values, either in environment variables or directly here
    AZURE_STORAGE_ACCOUNT = os.environ["AZURE_STORAGE_ACCOUNT"]
    AZURE_STORAGE_CONTAINER = os.environ["AZURE_STORAGE_CONTAINER"]
    AZURE_USERSTORAGE_ACCOUNT = os.environ.get("AZURE_USERSTORAGE_ACCOUNT")
    AZURE_USERSTORAGE_CONTAINER = os.environ.get("AZURE_USERSTORAGE_CONTAINER")
    AZURE_SEARCH_SERVICE = os.environ["AZURE_SEARCH_SERVICE"]
    AZURE_SEARCH_INDEX = os.environ["AZURE_SEARCH_INDEX"]
    # Shared by all OpenAI deployments
    OPENAI_HOST = os.getenv("OPENAI_HOST", "azure")
    OPENAI_CHATGPT_MODEL = os.environ["AZURE_OPENAI_CHATGPT_MODEL"]
    OPENAI_EMB_MODEL = os.getenv("AZURE_OPENAI_EMB_MODEL_NAME", "text-embedding-ada-002")
    OPENAI_EMB_DIMENSIONS = int(os.getenv("AZURE_OPENAI_EMB_DIMENSIONS", 1536))
    # Used with Azure OpenAI deployments
    AZURE_OPENAI_SERVICE_1 = os.getenv("AZURE_OPENAI_SERVICE_1")

    AZURE_OPENAI_GPT4V_DEPLOYMENT = os.environ.get("AZURE_OPENAI_GPT4V_DEPLOYMENT")
    AZURE_OPENAI_GPT4V_MODEL = os.environ.get("AZURE_OPENAI_GPT4V_MODEL")
    AZURE_OPENAI_CHATGPT_DEPLOYMENT = (
        os.getenv("AZURE_OPENAI_CHATGPT_DEPLOYMENT") if OPENAI_HOST.startswith("azure") else None
    )
    AZURE_OPENAI_EMB_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMB_DEPLOYMENT") if OPENAI_HOST.startswith("azure") else None
    AZURE_OPENAI_CUSTOM_URL = os.getenv("AZURE_OPENAI_CUSTOM_URL")
    AZURE_VISION_ENDPOINT = os.getenv("AZURE_VISION_ENDPOINT", "")
    # Used only with non-Azure OpenAI deployments
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_ORGANIZATION = os.getenv("OPENAI_ORGANIZATION")

    AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
    AZURE_USE_AUTHENTICATION = os.getenv("AZURE_USE_AUTHENTICATION", "").lower() == "true"
    AZURE_ENFORCE_ACCESS_CONTROL = os.getenv("AZURE_ENFORCE_ACCESS_CONTROL", "").lower() == "true"
    AZURE_ENABLE_GLOBAL_DOCUMENT_ACCESS = os.getenv("AZURE_ENABLE_GLOBAL_DOCUMENT_ACCESS", "").lower() == "true"
    AZURE_ENABLE_UNAUTHENTICATED_ACCESS = os.getenv("AZURE_ENABLE_UNAUTHENTICATED_ACCESS", "").lower() == "true"
    AZURE_SERVER_APP_ID = os.getenv("AZURE_SERVER_APP_ID")
    AZURE_SERVER_APP_SECRET = os.getenv("AZURE_SERVER_APP_SECRET")
    AZURE_CLIENT_APP_ID = os.getenv("AZURE_CLIENT_APP_ID")
    AZURE_AUTH_TENANT_ID = os.getenv("AZURE_AUTH_TENANT_ID", AZURE_TENANT_ID)

    KB_FIELDS_CONTENT = os.getenv("KB_FIELDS_CONTENT", "content")
    KB_FIELDS_SOURCEPAGE = os.getenv("KB_FIELDS_SOURCEPAGE", "sourcepage")

    AZURE_SEARCH_QUERY_LANGUAGE = os.getenv("AZURE_SEARCH_QUERY_LANGUAGE", "en-us")
    AZURE_SEARCH_QUERY_SPELLER = os.getenv("AZURE_SEARCH_QUERY_SPELLER", "lexicon")
    AZURE_SEARCH_SEMANTIC_RANKER = os.getenv("AZURE_SEARCH_SEMANTIC_RANKER", "free").lower()

    AZURE_SPEECH_SERVICE_ID = os.getenv("AZURE_SPEECH_SERVICE_ID")
    AZURE_SPEECH_SERVICE_LOCATION = os.getenv("AZURE_SPEECH_SERVICE_LOCATION")
    AZURE_SPEECH_VOICE = os.getenv("AZURE_SPEECH_VOICE", "en-US-AndrewMultilingualNeural")

    USE_GPT4V = os.getenv("USE_GPT4V", "").lower() == "true"
    USE_USER_UPLOAD = os.getenv("USE_USER_UPLOAD", "").lower() == "true"
    USE_SPEECH_INPUT_BROWSER = os.getenv("USE_SPEECH_INPUT_BROWSER", "").lower() == "true"
    USE_SPEECH_OUTPUT_BROWSER = os.getenv("USE_SPEECH_OUTPUT_BROWSER", "").lower() == "true"
    USE_SPEECH_OUTPUT_AZURE = os.getenv("USE_SPEECH_OUTPUT_AZURE", "").lower() == "true"

    # Use the current user identity to authenticate with Azure OpenAI, AI Search and Blob Storage (no secrets needed,
    # just use 'az login' locally, and managed identity when deployed on Azure). If you need to use keys, use separate AzureKeyCredential instances with the
    # keys for each service
    # If you encounter a blocking error during a DefaultAzureCredential resolution, you can exclude the problematic credential by using a parameter (ex. exclude_shared_token_cache_credential=True)
    # azure_credential = DefaultAzureCredential(exclude_shared_token_cache_credential=True)
    # azure_credential = DefaultAzureCredential(exclude_managed_identity_credential=True, exclude_shared_token_cache_credential = True) # nur für die lokalen tests

    # Use the current user identity for keyless authentication to Azure services.
    # This assumes you use 'azd auth login' locally, and managed identity when deployed on Azure.
    # The managed identity is setup in the infra/ folder.
    azure_credential: Union[AzureDeveloperCliCredential, ManagedIdentityCredential]
    if os.getenv("WEBSITE_HOSTNAME"):  # Environment variable set on Azure Web Apps
        current_app.logger.info("Setting up Azure credential using ManagedIdentityCredential")
        azure_credential = ManagedIdentityCredential()
    elif AZURE_TENANT_ID:
        current_app.logger.info(
            "Setting up Azure credential using AzureDeveloperCliCredential with tenant_id %s", AZURE_TENANT_ID
        )
        azure_credential = AzureDeveloperCliCredential(tenant_id=AZURE_TENANT_ID, process_timeout=60)
    else:
        current_app.logger.info("Setting up Azure credential using AzureDeveloperCliCredential for home tenant")
        azure_credential = AzureDeveloperCliCredential(process_timeout=60)

    # Set up clients for AI Search and Storage
    search_client = SearchClient(
        endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
        index_name=AZURE_SEARCH_INDEX,
        credential=azure_credential,
    )

    db_name = os.environ["COSMOS_ACCOUNT_NAME"]
    chat_history_client = CosmosClient(url=f"https://{db_name}.documents.azure.com:443/", credential=azure_credential)

    blob_container_client = ContainerClient(
        f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net", AZURE_STORAGE_CONTAINER, credential=azure_credential
    )

    # Set up authentication helper
    search_index = None
    if AZURE_USE_AUTHENTICATION:
        search_index_client = SearchIndexClient(
            endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
            credential=azure_credential,
        )
        search_index = await search_index_client.get_index(AZURE_SEARCH_INDEX)
        await search_index_client.close()
    auth_helper = AuthenticationHelper(
        search_index=search_index,
        use_authentication=AZURE_USE_AUTHENTICATION,
        server_app_id=AZURE_SERVER_APP_ID,
        server_app_secret=AZURE_SERVER_APP_SECRET,
        client_app_id=AZURE_CLIENT_APP_ID,
        tenant_id=AZURE_AUTH_TENANT_ID,
        require_access_control=AZURE_ENFORCE_ACCESS_CONTROL,
        enable_global_documents=AZURE_ENABLE_GLOBAL_DOCUMENT_ACCESS,
        enable_unauthenticated_access=AZURE_ENABLE_UNAUTHENTICATED_ACCESS,
    )

    if USE_USER_UPLOAD:
        print("ADDING USER BLOC CONTAINER")
        current_app.logger.info("USE_USER_UPLOAD is true, setting up user upload feature")
        if not AZURE_USERSTORAGE_ACCOUNT or not AZURE_USERSTORAGE_CONTAINER:
            raise ValueError(
                "AZURE_USERSTORAGE_ACCOUNT and AZURE_USERSTORAGE_CONTAINER must be set when USE_USER_UPLOAD is true"
            )
        user_blob_container_client = FileSystemClient(
            f"https://{AZURE_USERSTORAGE_ACCOUNT}.dfs.core.windows.net",
            AZURE_USERSTORAGE_CONTAINER,
            credential=azure_credential,
        )
        current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT] = user_blob_container_client

        # Set up ingester
        file_processors = setup_file_processors(
            azure_credential=azure_credential,
            document_intelligence_service=os.getenv("AZURE_DOCUMENTINTELLIGENCE_SERVICE"),
            local_pdf_parser=os.getenv("USE_LOCAL_PDF_PARSER", "").lower() == "true",
            local_html_parser=os.getenv("USE_LOCAL_HTML_PARSER", "").lower() == "true",
            search_images=USE_GPT4V,
        )
        search_info = await setup_search_info(
            search_service=AZURE_SEARCH_SERVICE, index_name=AZURE_SEARCH_INDEX, azure_credential=azure_credential
        )
        text_embeddings_service = setup_embeddings_service(
            azure_credential=azure_credential,
            openai_host=OPENAI_HOST,
            openai_model_name=OPENAI_EMB_MODEL,
            openai_service=AZURE_OPENAI_SERVICE_1,
            openai_custom_url=AZURE_OPENAI_CUSTOM_URL,
            openai_deployment=AZURE_OPENAI_EMB_DEPLOYMENT,
            openai_dimensions=OPENAI_EMB_DIMENSIONS,
            openai_key=clean_key_if_exists(OPENAI_API_KEY),
            openai_org=OPENAI_ORGANIZATION,
            disable_vectors=os.getenv("USE_VECTORS", "").lower() == "false",
        )
        ingester = UploadUserFileStrategy(
            search_info=search_info, embeddings=text_embeddings_service, file_processors=file_processors
        )
        current_app.config[CONFIG_INGESTER] = ingester

    # Used by the OpenAI SDK
    openai_client: AsyncOpenAI

    if USE_SPEECH_OUTPUT_AZURE:
        if not AZURE_SPEECH_SERVICE_ID or AZURE_SPEECH_SERVICE_ID == "":
            raise ValueError("Azure speech resource not configured correctly, missing AZURE_SPEECH_SERVICE_ID")
        if not AZURE_SPEECH_SERVICE_LOCATION or AZURE_SPEECH_SERVICE_LOCATION == "":
            raise ValueError("Azure speech resource not configured correctly, missing AZURE_SPEECH_SERVICE_LOCATION")
        current_app.config[CONFIG_SPEECH_SERVICE_ID] = AZURE_SPEECH_SERVICE_ID
        current_app.config[CONFIG_SPEECH_SERVICE_LOCATION] = AZURE_SPEECH_SERVICE_LOCATION
        current_app.config[CONFIG_SPEECH_SERVICE_VOICE] = AZURE_SPEECH_VOICE
        # Wait until token is needed to fetch for the first time
        current_app.config[CONFIG_SPEECH_SERVICE_TOKEN] = None
        current_app.config[CONFIG_CREDENTIAL] = azure_credential

    # Initialize the list of backends for load balancing, starting with the primary instance
    backends: List[Backend] = [Backend(f"{os.getenv('AZURE_OPENAI_SERVICE_1')}.openai.azure.com", priority=1)]

    # Conditionally add additional OpenAI service instances if the environment variables are set
    if os.getenv("AZURE_OPENAI_SERVICE_2"):
        backends.append(Backend(f"{os.getenv('AZURE_OPENAI_SERVICE_2')}.openai.azure.com", priority=1))

    if os.getenv("AZURE_OPENAI_SERVICE_3"):
        backends.append(Backend(f"{os.getenv('AZURE_OPENAI_SERVICE_3')}.openai.azure.com", priority=1))

    if os.getenv("AZURE_OPENAI_SERVICE_4"):
        backends.append(Backend(f"{os.getenv('AZURE_OPENAI_SERVICE_4')}.openai.azure.com", priority=1))

    # Azure OpenAI setup
    if OPENAI_HOST.startswith("azure"):
        api_version = os.getenv("AZURE_OPENAI_API_VERSION") or "2024-03-01-preview"

        # Handle 'azure_custom' case where a custom URL is provided
        if OPENAI_HOST == "azure_custom":
            if not (AZURE_OPENAI_CUSTOM_URL := os.getenv("AZURE_OPENAI_CUSTOM_URL")):
                raise ValueError("AZURE_OPENAI_CUSTOM_URL must be set when OPENAI_HOST is 'azure_custom'")
            endpoint = AZURE_OPENAI_CUSTOM_URL
        else:
            if not (AZURE_OPENAI_SERVICE_1 := os.getenv("AZURE_OPENAI_SERVICE_1")):
                raise ValueError("AZURE_OPENAI_SERVICE must be set when OPENAI_HOST is 'azure'")
            print(f"AZURE_OPENAI_SERVICE_1: {os.getenv('AZURE_OPENAI_SERVICE_1')}")
            print(f"AZURE_OPENAI_SERVICE_2: {os.getenv('AZURE_OPENAI_SERVICE_2')}")
            print(f"AZURE_OPENAI_SERVICE_3: {os.getenv('AZURE_OPENAI_SERVICE_3')}")
            print(f"AZURE_OPENAI_SERVICE_4: {os.getenv('AZURE_OPENAI_SERVICE_4')}")
            endpoint = f"https://{AZURE_OPENAI_SERVICE_1}.openai.azure.com"

        # Initialize client_args for load balancing (if additional instances are provided)
        client_args = {}

        if len(backends) > 1:
            # Set up the load balancer if multiple backends are available
            lb = AsyncLoadBalancer(backends)
            # Wrap the load balancer transport with RetryTransport
            retry_transport = RetryTransport(lb, retries=5, backoff_factor=1.0)
            client_args["http_client"] = httpx.AsyncClient(transport=retry_transport)
        else:
            # Use default transport with retries
            retry_transport = RetryTransport(httpx.AsyncHTTPTransport(), retries=5, backoff_factor=1.0)
            client_args["http_client"] = httpx.AsyncClient(transport=retry_transport)

        # Handle API key-based authentication
        if api_key := os.getenv("AZURE_OPENAI_API_KEY"):
            logging.info("Using API key for OpenAI authentication.")
            openai_client = AsyncAzureOpenAI(
                api_version=api_version,
                azure_endpoint=endpoint,
                api_key=api_key,
                **client_args,  # Inject load balancer if available
            )
        else:
            # Handle token-based authentication using Azure AD
            logging.info("Using Azure AD token for OpenAI authentication.")
            token_provider = get_bearer_token_provider(azure_credential, "https://cognitiveservices.azure.com/.default")
            openai_client = AsyncAzureOpenAI(
                api_version=api_version,
                azure_endpoint=endpoint,
                azure_ad_token_provider=token_provider,
                **client_args,  # Inject load balancer if available
            )

    # Handle local OpenAI instance case
    elif OPENAI_HOST == "local":
        logging.info("Using local OpenAI instance.")
        openai_client = AsyncOpenAI(
            base_url=os.environ["OPENAI_BASE_URL"],
            api_key="no-key-required",
        )

    # Fallback for standard OpenAI API usage
    else:
        logging.info("Using standard OpenAI API with API key.")
        openai_client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            organization=os.getenv("OPENAI_ORGANIZATION"),
        )

    current_app.config[CONFIG_OPENAI_CLIENT] = openai_client
    current_app.config[CONFIG_SEARCH_CLIENT] = search_client
    current_app.config[CONFIG_BLOB_CONTAINER_CLIENT] = blob_container_client
    current_app.config[CONFIG_AUTH_CLIENT] = auth_helper
    current_app.config[CONFIG_CHAT_HISTORY_CLIENT] = chat_history_client

    current_app.config[CONFIG_GPT4V_DEPLOYED] = bool(USE_GPT4V)
    current_app.config[CONFIG_SEMANTIC_RANKER_DEPLOYED] = AZURE_SEARCH_SEMANTIC_RANKER != "disabled"
    current_app.config[CONFIG_VECTOR_SEARCH_ENABLED] = os.getenv("USE_VECTORS", "").lower() != "false"
    current_app.config[CONFIG_USER_UPLOAD_ENABLED] = bool(USE_USER_UPLOAD)
    current_app.config[CONFIG_SPEECH_INPUT_ENABLED] = USE_SPEECH_INPUT_BROWSER
    current_app.config[CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED] = USE_SPEECH_OUTPUT_BROWSER
    current_app.config[CONFIG_SPEECH_OUTPUT_AZURE_ENABLED] = USE_SPEECH_OUTPUT_AZURE

    current_app.config[CONFIG_CHAT_APPROACH] = ChatReadRetrieveReadApproach(
        search_client=search_client,
        openai_client=openai_client,
        auth_helper=auth_helper,
        chatgpt_model=OPENAI_CHATGPT_MODEL,
        chatgpt_deployment=AZURE_OPENAI_CHATGPT_DEPLOYMENT,
        embedding_model=OPENAI_EMB_MODEL,
        embedding_deployment=AZURE_OPENAI_EMB_DEPLOYMENT,
        embedding_dimensions=OPENAI_EMB_DIMENSIONS,
        sourcepage_field=KB_FIELDS_SOURCEPAGE,
        content_field=KB_FIELDS_CONTENT,
        query_language=AZURE_SEARCH_QUERY_LANGUAGE,
        query_speller=AZURE_SEARCH_QUERY_SPELLER,
    )

    if USE_GPT4V:
        current_app.logger.info("USE_GPT4V is true, setting up GPT4V approach")
        if not AZURE_OPENAI_GPT4V_MODEL:
            raise ValueError("AZURE_OPENAI_GPT4V_MODEL must be set when USE_GPT4V is true")
        token_provider = get_bearer_token_provider(azure_credential, "https://cognitiveservices.azure.com/.default")

        current_app.config[CONFIG_CHAT_VISION_APPROACH] = ChatReadRetrieveReadVisionApproach(
            search_client=search_client,
            openai_client=openai_client,
            blob_container_client=blob_container_client,
            auth_helper=auth_helper,
            vision_endpoint=AZURE_VISION_ENDPOINT,
            vision_token_provider=token_provider,
            chatgpt_model=OPENAI_CHATGPT_MODEL,
            chatgpt_deployment=AZURE_OPENAI_CHATGPT_DEPLOYMENT,
            gpt4v_deployment=AZURE_OPENAI_GPT4V_DEPLOYMENT,
            gpt4v_model=AZURE_OPENAI_GPT4V_MODEL,
            embedding_model=OPENAI_EMB_MODEL,
            embedding_deployment=AZURE_OPENAI_EMB_DEPLOYMENT,
            embedding_dimensions=OPENAI_EMB_DIMENSIONS,
            sourcepage_field=KB_FIELDS_SOURCEPAGE,
            content_field=KB_FIELDS_CONTENT,
            query_language=AZURE_SEARCH_QUERY_LANGUAGE,
            query_speller=AZURE_SEARCH_QUERY_SPELLER,
        )


@bp.after_app_serving
async def close_clients():
    await current_app.config[CONFIG_SEARCH_CLIENT].close()
    await current_app.config[CONFIG_BLOB_CONTAINER_CLIENT].close()
    if current_app.config.get(CONFIG_USER_BLOB_CONTAINER_CLIENT):
        await current_app.config[CONFIG_USER_BLOB_CONTAINER_CLIENT].close()


def create_app():
    from routes import chat_api_bp, chat_history_bp, docs_bp, saved_prompts_bp, user_uploads_bp

    app = Quart(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB limit
    app.register_blueprint(bp)
    app.register_blueprint(docs_bp)
    app.register_blueprint(chat_history_bp)
    app.register_blueprint(saved_prompts_bp)
    app.register_blueprint(user_uploads_bp)
    app.register_blueprint(chat_api_bp)

    if os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
        configure_azure_monitor()
        # This tracks HTTP requests made by aiohttp:
        AioHttpClientInstrumentor().instrument()
        # This tracks HTTP requests made by httpx:
        HTTPXClientInstrumentor().instrument()
        # This tracks OpenAI SDK requests:
        OpenAIInstrumentor().instrument()
        # This middleware tracks app route requests:
        app.asgi_app = OpenTelemetryMiddleware(app.asgi_app)  # type: ignore[assignment]

    default_level = "INFO"  # In development, log more verbosely
    if os.getenv("WEBSITE_HOSTNAME"):  # In production, don't log as heavily
        default_level = "WARNING"
    logging.basicConfig(level=os.getenv("APP_LOG_LEVEL", default_level))

    if allowed_origin := os.getenv("ALLOWED_ORIGIN"):
        app.logger.info("CORS enabled for %s", allowed_origin)
        cors(app, allow_origin=allowed_origin, allow_methods=["GET", "POST"])
    return app
