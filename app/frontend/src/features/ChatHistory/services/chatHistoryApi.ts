import { ChatAppResponse } from "../../../api/models";
import { getHeaders } from "../../../api/api";
import { ChatHistoryDbResponse, ConversationChatHistoryDbResponse } from "../models";

export async function getCompleteChatHistorySingleUserApi(idToken: string): Promise<ChatHistoryDbResponse[]> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`/chats`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting chat history failed: ${response}`);
    }

    const dataResponse: ChatHistoryDbResponse[] = await response.json();
    return dataResponse;
}

export async function getSingleChatHistoryApi(idToken: string, chat_id: string): Promise<ConversationChatHistoryDbResponse[]> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`/chats/${chat_id}`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting chat failed: ${response}`);
    }

    const dataResponse: ConversationChatHistoryDbResponse[] = await response.json();
    return dataResponse;
}

export async function updateChatHistoryAnswersApi(
    idToken: string,
    chatId: string,
    answers: [user: string, response: ChatAppResponse][],
    title: string
): Promise<ChatHistoryDbResponse> {
    const id = chatId;
    return await updateChatHistoryApi(idToken, JSON.stringify({ answers, id }));
}

export async function updateChatHistoryTitleApi(idToken: string, chatId: string, title: string): Promise<ChatHistoryDbResponse> {
    const id = chatId;
    return await updateChatHistoryApi(idToken, JSON.stringify({ title, id }));
}

export async function updateChatHistoryApi(idToken: string, requestBody: string): Promise<ChatHistoryDbResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`/chats`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: requestBody
    });

    if (!response.ok) {
        throw new Error(`Updating chat history failed: ${response}`);
    }

    const dataResponse = await response.json();
    return dataResponse as ChatHistoryDbResponse;
}

export async function deleteSingleChatHistoryApi(idToken: string, chat_id: string): Promise<Response> {
    const headers = await getHeaders(idToken);
    const path = chat_id;
    const response = await fetch(`/chats/${path}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        console.log(response);
        throw new Error(`Deleting chat failed:`);
    }

    return response;
}

export async function postChatHistoryApi(
    idToken: string,
    chatId: string,
    answers: [user: string, response: ChatAppResponse][]
): Promise<ChatHistoryDbResponse> {
    const headers = await getHeaders(idToken);
    const id = chatId;
    const response = await fetch(`/chats`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ answers, id })
    });

    if (!response.ok) {
        throw new Error(`Posting chat history failed: ${response}`);
    }

    const dataResponse = await response.json();
    return dataResponse as ChatHistoryDbResponse;
}
