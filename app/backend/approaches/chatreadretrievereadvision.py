from typing import Any, Awaitable, Callable, Coroutine, Optional, Union

from approaches.approach import ThoughtStep
from approaches.chatapproach import ChatApproach
from azure.search.documents.aio import SearchClient
from azure.storage.blob.aio import ContainerClient
from azure.storage.filedatalake.aio import FileSystemClient
from core.authentication import AuthenticationHelper
from core.imageshelper import fetch_image
from models import Overrides
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionContentPartImageParam,
    ChatCompletionContentPartParam,
    ChatCompletionMessageParam,
)
from openai_messages_token_helper import build_messages, get_token_limit


class ChatReadRetrieveReadVisionApproach(ChatApproach):
    """
    A multi-step approach that first uses OpenAI to turn the user's question into a search query,
    then uses Azure AI Search to retrieve relevant documents, and then sends the conversation history,
    original user question, and search results to OpenAI to generate a response.
    """

    def __init__(
        self,
        *,
        search_client: SearchClient,
        blob_container_client: ContainerClient,
        openai_client: AsyncOpenAI,
        auth_helper: AuthenticationHelper,
        chatgpt_model: str,
        chatgpt_deployment: Optional[str],  # Not needed for non-Azure OpenAI
        gpt4v_deployment: Optional[str],  # Not needed for non-Azure OpenAI
        gpt4v_model: str,
        embedding_deployment: Optional[str],  # Not needed for non-Azure OpenAI or for retrieval_mode="text"
        embedding_model: str,
        embedding_dimensions: int,
        sourcepage_field: str,
        content_field: str,
        query_language: str,
        query_speller: str,
        vision_endpoint: str,
        vision_token_provider: Callable[[], Awaitable[str]]
    ):
        self.search_client = search_client
        self.blob_container_client = blob_container_client
        self.openai_client = openai_client
        self.auth_helper = auth_helper
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.gpt4v_deployment = gpt4v_deployment
        self.gpt4v_model = gpt4v_model
        self.embedding_deployment = embedding_deployment
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.sourcepage_field = sourcepage_field
        self.content_field = content_field
        self.query_language = query_language
        self.query_speller = query_speller
        self.vision_endpoint = vision_endpoint
        self.vision_token_provider = vision_token_provider
        self.chatgpt_token_limit = get_token_limit(gpt4v_model)

    @property
    def system_message_chat_conversation(self):
        return """
        You are an intelligent assistant chatbot representing GSK Stockmann, a leading independent European business law firm, here to assist users with questions of any kind.
        You have access to documents which can contain contain text, graphs, tables and images.
        Each image source has the file name in the top left corner of the image with coordinates (10,10) pixels and is in the format SourceFileName:<file_name>
        Each text source starts in a new line and has the file name followed by colon and the actual information
        Always include the source name from the image or text for each fact you use in the response in the format: [filename]
        Answer the following question using only the data provided in the sources below.
        If asking a clarifying question to the user would help, ask the question.
        Be brief in your answers.
        For tabular information return it as an html table. Do not return markdown format.
        The text and image source can be the same file name, don't use the image title when citing the image source, only use the file name as mentioned
        Focus your answers on the most recent message sent, and use the conversation history to contextualize your responses.
        If you cannot answer using the sources below, say you don't know. Return just the answer without any input texts.
        {follow_up_questions_prompt}
        {injected_prompt}
        """

    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: Overrides,
        auth_claims: dict[str, Any],
        user_file_storage: FileSystemClient,
        chat_id: str,
        should_stream: bool = False,
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, Union[ChatCompletion, AsyncStream[ChatCompletionChunk]]]]:
        filter = self.build_filter(overrides, auth_claims, chat_id)

        original_user_query = messages[-1]["content"]
        if not isinstance(original_user_query, str):
            raise ValueError("The most recent message content must be a string.")
        past_messages: list[ChatCompletionMessageParam] = messages[:-1]
        user_query_request = "Generate search query for: " + original_user_query

        query_response_token_limit = 100
        query_model = self.chatgpt_model
        query_deployment = self.chatgpt_deployment
        query_messages = build_messages(
            model=query_model,
            system_prompt=self.context_retrieval_prompt_template,
            past_messages=past_messages,
            new_user_content=user_query_request,
            max_tokens=self.chatgpt_token_limit - query_response_token_limit,
        )

        n_files_uploaded = await self.count_files_in_user_folder(user_file_storage, auth_claims["oid"], chat_id)
        if len(n_files_uploaded) > 0:
            # STEP 1: Generate an optimized keyword search query based on the chat history and the last question

            chat_completion: ChatCompletion = await self.openai_client.chat.completions.create(
                model=query_deployment if query_deployment else query_model,
                messages=query_messages,
                temperature=0.0,  # Minimize creativity for search query generation
                max_tokens=query_response_token_limit,
                n=1,
                seed=overrides.seed,
            )

            query_text = self.get_search_query(chat_completion, original_user_query)

            # STEP 2: Retrieve relevant documents from the search index with the GPT optimized query

            # If retrieval mode includes vectors, compute an embedding for the query
            vectors = []
            if overrides.use_vector_search:
                for field in overrides.vector_fields:
                    vector = (
                        await self.compute_text_embedding(query_text)
                        if field == "embedding"
                        else await self.compute_image_embedding(query_text)
                    )
                    vectors.append(vector)

            results = await self.search(
                overrides.top,
                query_text,
                filter,
                vectors,
                overrides.use_text_search,
                overrides.use_vector_search,
                overrides.use_semantic_ranker,
                overrides.use_semantic_captions,
                overrides.minimum_search_score,
                overrides.minimum_reranker_score,
            )
            sources_content = self.get_sources_content(
                results, overrides.use_semantic_captions, use_image_citation=True
            )
            content = "\n".join(sources_content)
        else:
            content = ""
            sources_content = [""]
            query_text = "Search query skipped, no files to search for current user."
            results = {"results": "Search not performed due to no files uploaded for this user."}

        # STEP 3: Generate a contextual and content specific answer using the search results and chat history

        # Allow client to replace the entire prompt, or to inject into the existing prompt using >>>
        system_message = self.get_system_prompt(
            overrides.prompt_template,
            self.follow_up_questions_prompt_content if overrides.suggest_followup_questions else "",
        )

        user_content: list[ChatCompletionContentPartParam] = [{"text": original_user_query, "type": "text"}]
        image_list: list[ChatCompletionContentPartImageParam] = []

        if overrides.send_text_to_gptvision:
            user_content.append({"text": "\n\nSources:\n" + content, "type": "text"})
        if overrides.send_images_to_gptvision:
            for result in results:
                url = await fetch_image(self.blob_container_client, result)
                if url:
                    image_list.append({"image_url": url, "type": "image_url"})
            user_content.extend(image_list)

        response_token_limit = 1024
        messages = build_messages(
            model=self.gpt4v_model,
            system_prompt=system_message,
            past_messages=messages[:-1],
            new_user_content=user_content,
            max_tokens=self.chatgpt_token_limit - response_token_limit,
        )

        data_points = {
            "text": sources_content,
            "images": [d["image_url"] for d in image_list],
        }

        extra_info = {
            "data_points": data_points,
            "thoughts": [
                ThoughtStep(
                    "Prompt to generate search query",
                    [str(message) for message in query_messages],
                    (
                        {"model": query_model, "deployment": query_deployment}
                        if query_deployment
                        else {"model": query_model}
                    ),
                ),
                ThoughtStep(
                    "Search using generated search query",
                    query_text,
                    {
                        "use_semantic_captions": overrides.use_semantic_captions,
                        "use_semantic_ranker": overrides.use_semantic_ranker,
                        "top": overrides.top,
                        "filter": filter,
                        "vector_fields": overrides.vector_fields,
                        "use_text_search": overrides.use_text_search,
                    },
                ),
                ThoughtStep(
                    "Search results",
                    [result.serialize_for_results() for result in results] if len(n_files_uploaded) else [results],
                ),
                ThoughtStep(
                    "Prompt to generate answer",
                    [str(message) for message in messages],
                    (
                        {"model": self.gpt4v_model, "deployment": self.gpt4v_deployment}
                        if self.gpt4v_deployment
                        else {"model": self.gpt4v_model}
                    ),
                ),
            ],
        }

        chat_coroutine = self.openai_client.chat.completions.create(
            model=self.gpt4v_deployment if self.gpt4v_deployment else self.gpt4v_model,
            messages=messages,
            temperature=overrides.temperature,
            max_tokens=response_token_limit,
            n=1,
            stream=should_stream,
            seed=overrides.seed,
        )
        return (extra_info, chat_coroutine)
