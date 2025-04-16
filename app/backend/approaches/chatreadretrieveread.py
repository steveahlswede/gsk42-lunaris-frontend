from typing import Any, Coroutine, List, Literal, Optional, Union, overload

from approaches.approach import ThoughtStep
from approaches.chatapproach import ChatApproach
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorQuery
from azure.storage.filedatalake.aio import FileSystemClient
from core.authentication import AuthenticationHelper
from models import Overrides
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam, ChatCompletionToolParam
from openai_messages_token_helper import build_messages, get_token_limit


class ChatReadRetrieveReadApproach(ChatApproach):
    """
    A multi-step approach that first uses OpenAI to turn the user's question into a search query,
    then uses Azure AI Search to retrieve relevant documents, and then sends the conversation history,
    original user question, and search results to OpenAI to generate a response.
    """

    def __init__(
        self,
        *,
        search_client: SearchClient,
        auth_helper: AuthenticationHelper,
        openai_client: AsyncOpenAI,
        chatgpt_model: str,
        chatgpt_deployment: Optional[str],  # Not needed for non-Azure OpenAI
        embedding_deployment: Optional[str],  # Not needed for non-Azure OpenAI or for retrieval_mode="text"
        embedding_model: str,
        embedding_dimensions: int,
        sourcepage_field: str,
        content_field: str,
        query_language: str,
        query_speller: str,
    ):
        self.search_client = search_client
        self.openai_client = openai_client
        self.auth_helper = auth_helper
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.embedding_deployment = embedding_deployment
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.sourcepage_field = sourcepage_field
        self.content_field = content_field
        self.query_language = query_language
        self.query_speller = query_speller
        self.chatgpt_token_limit = get_token_limit(chatgpt_model)

    @property
    def system_message_chat_conversation(self):
        return """You are an intelligent assistant chatbot representing GSK Stockmann, a leading independent European business law firm, here to assist users with questions of any kind.
                Guidelines:
                Code Handling: When the user asks for code (e.g., HTML, Java, Python), never execute the code. Always display the code in a codebox (using three backticks ``` ) to prevent execution. Avoid utilizing any code interpreter or execution environment. This ensures security and avoids risks from code execution.
                Table Formatting: When asked for a table, always return it in HTML format without using markdown or other formats. However, ensure you treat the HTML as non-executable when providing the response. Do not escape table-related HTML tags like <table>. Do not surround the HTML tags with any code blocks or backticks.
                Source Attribution: Always include the source for each fact used in your response in the format [filename]. Each source has a name followed by a colon and the actual information. Use square brackets to reference the source, for example [info1.txt]. Do not combine sources; list each source separately, for example [info1.txt][info2.pdf].
                Brevity and Directness: Keep responses concise and to the point, focusing solely on the information available. Answer directly without unnecessary elaboration or unrelated content.
                Know Your Limits and Stay Focused: Prioritize using the provided sources to deliver accurate answers. If the answer cannot be directly derived from these sources, draw on your general knowledge from training to provide a well-informed, context-based response. If uncertainty remains, state that you do not know. Avoid speculation and personal opinions.
                Language Adaptation: Always respond in the user's preferred language, adapting to their communication style.
                Clarifying Questions: If further information would help, ask appropriate clarifying questions.
                Factual and Helpful: Ensure all responses are strictly factual, aligned with the provided sources, and maintain a professional and user-oriented tone.
                Context Awareness: If a question relates to data extraction or document-specific content, fully stick to the provided documents for your response. Use only the information within the documents and attribute all facts explicitly.
                Adaptive Knowledge Use: Use general knowledge to provide context, background, or industry standards when it enhances the response and no document constraints are set.
                Focus your answers on the most recent message sent, and use the conversation history to contextualize your responses.
                Let's maintain factual accuracy, provide helpful guidance, and stay within our defined limits!
        {follow_up_questions_prompt}
        {injected_prompt}
        """

    @property
    def tools(self) -> List[ChatCompletionToolParam]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "search_sources",
                    "description": "Retrieve sources from the Azure AI Search index",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "search_query": {
                                "type": "string",
                                "description": "Query string to retrieve documents from azure search eg: 'Health care plan'",
                            }
                        },
                        "required": ["search_query"],
                    },
                },
            }
        ]

    @overload
    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: Overrides,
        auth_claims: dict[str, Any],
        user_file_storage: FileSystemClient,
        chat_id: str,
        should_stream: Literal[False],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, ChatCompletion]]: ...

    @overload
    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: Overrides,
        auth_claims: dict[str, Any],
        user_file_storage: FileSystemClient,
        chat_id: str,
        should_stream: Literal[True],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, AsyncStream[ChatCompletionChunk]]]: ...

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
        user_query_request = "Generate search query for: " + original_user_query

        # only do the retrieval step if the user has at least 1 file uploaded
        n_files_uploaded = await self.count_files_in_user_folder(user_file_storage, auth_claims["oid"], chat_id)
        query_response_token_limit = 200

        if len(n_files_uploaded) > 0:
            query_messages = build_messages(
                model=self.chatgpt_model,
                system_prompt=self.context_retrieval_prompt_template,
                tools=self.tools,
                past_messages=messages[:-1],
                new_user_content=user_query_request,
                max_tokens=self.chatgpt_token_limit - query_response_token_limit,
            )
            content, sources_content, query_text, results = await self.perform_document_retrieval(
                query_response_token_limit, overrides, original_user_query, query_messages, filter
            )
        else:
            query_messages: List[ChatCompletionMessageParam] = [
                "Search query skipped, no files to search for current user."
            ]
            content = ""
            sources_content = [""]
            query_text = "Search query skipped, no files to search for current user."
            results = {"results": "Search not performed due to no files uploaded for this user."}

        # Allow client to replace the entire prompt, or to inject into the exiting prompt using >>>
        system_message = self.get_system_prompt(
            overrides.prompt_template,
            self.follow_up_questions_prompt_content if overrides.suggest_followup_questions else "",
        )

        response_token_limit = 2048
        messages = build_messages(
            model=self.chatgpt_model,
            system_prompt=system_message,
            past_messages=messages[:-1],
            new_user_content=original_user_query + "\n\nSources:\n" + content,
            max_tokens=self.chatgpt_token_limit - response_token_limit,
        )

        data_points = {"text": sources_content}

        extra_info = {
            "data_points": data_points,
            "thoughts": [
                ThoughtStep(
                    "Prompt to generate search query",
                    [str(message) for message in query_messages],
                    (
                        {"model": self.chatgpt_model, "deployment": self.chatgpt_deployment}
                        if self.chatgpt_deployment
                        else {"model": self.chatgpt_model}
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
                        "use_vector_search": overrides.use_vector_search,
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
                        {"model": self.chatgpt_model, "deployment": self.chatgpt_deployment}
                        if self.chatgpt_deployment
                        else {"model": self.chatgpt_model}
                    ),
                ),
            ],
        }

        chat_coroutine = self.openai_client.chat.completions.create(
            # Azure OpenAI takes the deployment name as the model name
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            messages=messages,
            temperature=overrides.temperature,
            max_tokens=response_token_limit,
            n=1,
            stream=should_stream,
            seed=overrides.seed,
        )
        return (extra_info, chat_coroutine)

    async def perform_document_retrieval(
        self,
        query_response_token_limit: int,
        overrides: Overrides,
        original_user_query: str,
        query_messages: List[ChatCompletionMessageParam],
        filter: Optional[str],
    ):

        # STEP 1: Generate an optimized keyword search query based on the chat history and the last question
        chat_completion: ChatCompletion = await self.openai_client.chat.completions.create(
            messages=query_messages,
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            temperature=0.0,  # Minimize creativity for search query generation
            max_tokens=query_response_token_limit,  # Setting too low risks malformed JSON, setting too high may affect performance
            n=1,
            tools=self.tools,
            seed=overrides.seed,
        )

        query_text = self.get_search_query(chat_completion, original_user_query)

        # STEP 2: Retrieve relevant documents from the search index with the GPT optimized query
        # If retrieval mode includes vectors, compute an embedding for the query
        vectors: list[VectorQuery] = []
        if overrides.use_vector_search:
            vectors.append(await self.compute_text_embedding(query_text))

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

        sources_content = self.get_sources_content(results, overrides.use_semantic_captions, use_image_citation=False)
        content = "\n".join(sources_content)

        return content, sources_content, query_text, results
