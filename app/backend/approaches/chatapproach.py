import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Optional

from approaches.approach import Approach
from azure.core.exceptions import ResourceNotFoundError
from azure.storage.filedatalake.aio import FileSystemClient
from config import CONFIG_USER_BLOB_CONTAINER_CLIENT
from models import Overrides
from openai.types.chat import ChatCompletion, ChatCompletionMessageParam


class ChatApproach(Approach, ABC):

    NO_RESPONSE = "0"

    follow_up_questions_prompt_content = """Generate 3 very brief follow-up questions that the user would likely ask next.
Enclose the follow-up questions in double angle brackets. Example:
<<Are there exclusions for prescriptions?>>
<<Which pharmacies can be ordered from?>>
<<What is the limit for over-the-counter medication?>>
Do no repeat questions that have already been asked.
Make sure the last question ends with ">>".
    """

    context_retrieval_prompt_template = """You will be provided with a history of the conversation so far, and a new question asked by the user that needs to be answered by searching in a knowledge base.
You have access to Azure AI Search index with the user's documents.
Generate a search query based on the conversation and the new question.
The query should be optimized for performing an embedding search.
Do not include cited source filenames and document names e.g info.txt or doc.pdf in the search query terms.
Do not include any text inside [] or <<>> in the search query terms.
Do not include any special characters like '+'.
If the question is not in English, translate the question to English before generating the search query.
If you cannot generate a search query, return just the number 0.

When answering the user's question, use the following examples:
User Question: How did crypto do last year?
Assistant Response: Summarize Cryptocurrency Market Dynamics from last year

User Question: What are my health plans?
Assistant Response: Show available health plans

User Question: Who is the author of this document?
Assistant Response: Document author name
    """

    @property
    @abstractmethod
    def system_message_chat_conversation(self) -> str:
        pass

    @abstractmethod
    async def run_until_final_call(
        self, messages, overrides, auth_claims, user_file_storage, chat_id, should_stream
    ) -> tuple:
        pass

    def get_system_prompt(self, override_prompt: Optional[str], follow_up_questions_prompt: str) -> str:
        if override_prompt is None:
            return self.system_message_chat_conversation.format(
                injected_prompt="", follow_up_questions_prompt=follow_up_questions_prompt
            )
        elif override_prompt.startswith(">>>"):
            return self.system_message_chat_conversation.format(
                injected_prompt=override_prompt[3:] + "\n", follow_up_questions_prompt=follow_up_questions_prompt
            )
        else:
            return override_prompt.format(follow_up_questions_prompt=follow_up_questions_prompt)

    def get_search_query(self, chat_completion: ChatCompletion, user_query: str):
        response_message = chat_completion.choices[0].message

        if response_message.tool_calls:
            for tool in response_message.tool_calls:
                if tool.type != "function":
                    continue
                function = tool.function
                if function.name == "search_sources":
                    arg = json.loads(function.arguments)
                    search_query = arg.get("search_query", self.NO_RESPONSE)
                    if search_query != self.NO_RESPONSE:
                        return search_query
        elif query_text := response_message.content:
            if query_text.strip() != self.NO_RESPONSE:
                return query_text
        return user_query

    def extract_followup_questions(self, content: str):
        return content.split("<<")[0], re.findall(r"<<([^>>]+)>>", content)

    async def run_without_streaming(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: Overrides,
        auth_claims: dict[str, Any],
        user_file_storage: FileSystemClient,
        chat_id: str,
        session_state: Any = None,
    ) -> dict[str, Any]:
        extra_info, chat_coroutine = await self.run_until_final_call(
            messages, overrides, auth_claims, user_file_storage, chat_id, should_stream=False
        )
        chat_completion_response: ChatCompletion = await chat_coroutine
        chat_resp = chat_completion_response.model_dump()  # Convert to dict to make it JSON serializable
        chat_resp = chat_resp["choices"][0]
        chat_resp["context"] = extra_info
        if overrides.suggest_followup_questions:
            content, followup_questions = self.extract_followup_questions(chat_resp["message"]["content"])
            chat_resp["message"]["content"] = content
            chat_resp["context"]["followup_questions"] = followup_questions
        chat_resp["session_state"] = session_state
        return chat_resp

    async def run_with_streaming(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: Overrides,
        auth_claims: dict[str, Any],
        user_file_storage: FileSystemClient,
        chat_id: str,
        session_state: Any = None,
    ) -> AsyncGenerator[dict, None]:
        extra_info, chat_coroutine = await self.run_until_final_call(
            messages, overrides, auth_claims, user_file_storage, chat_id, should_stream=True
        )
        yield {"delta": {"role": "assistant"}, "context": extra_info, "session_state": session_state}

        followup_questions_started = False
        followup_content = ""
        async for event_chunk in await chat_coroutine:
            # "2023-07-01-preview" API version has a bug where first response has empty choices
            event = event_chunk.model_dump()  # Convert pydantic model to dict
            if event["choices"]:
                completion = {"delta": event["choices"][0]["delta"]}
                # if event contains << and not >>, it is start of follow-up question, truncate
                content = completion["delta"].get("content")
                content = content or ""  # content may either not exist in delta, or explicitly be None
                if overrides.suggest_followup_questions and "<<" in content:
                    followup_questions_started = True
                    earlier_content = content[: content.index("<<")]
                    if earlier_content:
                        completion["delta"]["content"] = earlier_content
                        yield completion
                    followup_content += content[content.index("<<") :]
                elif followup_questions_started:
                    followup_content += content
                else:
                    yield completion
        if followup_content:
            _, followup_questions = self.extract_followup_questions(followup_content)
            yield {"delta": {"role": "assistant"}, "context": {"followup_questions": followup_questions}}

    async def run(
        self,
        messages: list[ChatCompletionMessageParam],
        session_state: Any = None,
        context: dict[str, Any] = {},
    ) -> dict[str, Any]:
        overrides = Overrides(**context.get("overrides", {}))
        auth_claims = context.get("auth_claims", {})
        chat_id = context["chatId"]
        user_file_storage = context[CONFIG_USER_BLOB_CONTAINER_CLIENT]
        return await self.run_without_streaming(
            messages, overrides, auth_claims, user_file_storage, chat_id, session_state
        )

    async def run_stream(
        self,
        messages: list[ChatCompletionMessageParam],
        session_state: Any = None,
        context: dict[str, Any] = {},
    ) -> AsyncGenerator[dict[str, Any], None]:
        overrides = Overrides(**context.get("overrides", {}))
        chat_id = context["chatId"]
        auth_claims = context.get("auth_claims", {})
        user_file_storage = context[CONFIG_USER_BLOB_CONTAINER_CLIENT]
        return self.run_with_streaming(messages, overrides, auth_claims, user_file_storage, chat_id, session_state)

    async def count_files_in_user_folder(
        self, user_blob_container_client: FileSystemClient, user_oid: str, chatid: str
    ) -> list:
        try:
            blobs = user_blob_container_client.get_paths(f"{user_oid}/{chatid}")
            items = [path async for path in blobs]
            return items
        except ResourceNotFoundError as e:
            logging.error(f"Tried to count files in user folder using oid '{user_oid}', but failed")
            logging.error(e)
            return []
        except Exception as error:
            logging.error(f"Tried to count files in user folder using oid '{user_oid}', but failed")
            logging.error(error)
            # return list with legnth > 0 so that we still trigger the 1st step of thought process in model
            # above error type we know is due to the user not having a folder and thus no files, but if we
            # get some unknown error, we don't want to risk skipping the 1st step incase the error is unrelated
            return [""]
