import { useState } from "react";
import { ChatHistoryDbResponse, HistoryRetrievedCodes } from "../models";
import { getToken } from "../../../authConfig";
import { getCompleteChatHistorySingleUserApi } from "../services/chatHistoryApi";
import { chatListToObject, ChatState } from "../../../contextProviderChat";
import { useMsal } from "@azure/msal-react";
import { listAllUploadedFilesApi } from "../../../api";

export function categorizeTimestamps(chatHistory: ChatHistoryDbResponse[]) {
    var chatsToday: ChatHistoryDbResponse[] = [];
    var chatsLastWeek: ChatHistoryDbResponse[] = [];
    var chatsOlder: ChatHistoryDbResponse[] = [];

    const now = new Date();
    const startOfToday = now.setHours(0, 0, 0, 0) / 1000;
    const oneDay = 24 * 60 * 60; // seconds in a day
    const startOfLastWeek = startOfToday - 7 * oneDay;

    chatHistory.forEach(chat => {
        if (chat._ts >= startOfToday) {
            chatsToday.push(chat);
        } else if (chat._ts >= startOfLastWeek && chat._ts < startOfToday) {
            chatsLastWeek.push(chat);
        } else {
            chatsOlder.push(chat);
        }
    });
    chatsToday.sort((a, b) => b._ts - a._ts);

    const categories = {
        today: chatsToday,
        lastWeek: chatsLastWeek,
        older: chatsOlder
    };

    return categories;
}

export const useChatHistory = (setAllSidebarChats: (chats: ChatState) => void, setAllFiles: (files: Record<string, string[]>) => void) => {
    const { instance } = useMsal();
    const [historyRetrieved, setHistoryRetrieved] = useState<HistoryRetrievedCodes>(HistoryRetrievedCodes.PENDING);
    const [pastChatsCategorized, setPastChatsCategorized] = useState<Record<string, ChatHistoryDbResponse[]> | undefined>(undefined);

    const categorizeChats = (chats: ChatHistoryDbResponse[]) => {
        setPastChatsCategorized(categorizeTimestamps(chats));
        if (chats.length === 0) {
            setHistoryRetrieved(HistoryRetrievedCodes.SUCCESS_EMPTY);
        } else {
            setHistoryRetrieved(HistoryRetrievedCodes.SUCCESS);
        }
    };

    const getChatsOfUser = async () => {
        setHistoryRetrieved(HistoryRetrievedCodes.PENDING);
        try {
            const token = await getToken(instance);
            if (!token) {
                setHistoryRetrieved(HistoryRetrievedCodes.FAILED);
                throw new Error("No authentication token available");
            }
            const chats = await getCompleteChatHistorySingleUserApi(token);
            setAllSidebarChats(chatListToObject(chats));
            categorizeChats(chats);
        } catch (error) {
            setHistoryRetrieved(HistoryRetrievedCodes.FAILED);
            console.error(error);
        }
    };

    const getFilesOfUserChats = async () => {
        try {
            const token = await getToken(instance);
            if (token) {
                const allFiles = await listAllUploadedFilesApi(token);
                setAllFiles(allFiles);
            } else {
                throw new Error("No authentication token available");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return { getChatsOfUser, getFilesOfUserChats, categorizeChats, historyRetrieved, pastChatsCategorized };
};
