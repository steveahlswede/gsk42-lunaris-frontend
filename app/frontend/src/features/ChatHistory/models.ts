import { ChatAppResponse } from "../../api";

export enum HistoryRetrievedCodes {
    PENDING,
    SUCCESS,
    SUCCESS_EMPTY,
    FAILED
}

export type ConversationChatHistoryDbResponse = {
    id: string;
    answers: [user: string, response: ChatAppResponse][];
};

export type ChatHistoryDbResponse = {
    id: string;
    title: string;
    _ts: number;
};
