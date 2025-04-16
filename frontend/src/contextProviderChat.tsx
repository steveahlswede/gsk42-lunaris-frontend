import { useState, useContext, createContext, ReactNode } from "react";
import { ChatAppResponse } from "./api";
import { v4 as uuidv4 } from "uuid";
import { ChatHistoryDbResponse } from "./features/ChatHistory/models";

export interface ChatState {
    [chatId: string]: ChatHistoryDbResponse;
}

export interface AllFiles {
    [chatId: string]: string[];
}

/**
 * Converts a list of chat history objects to a dictionary of chat history objects.
 * The dictionary is keyed by the id of the chat history object and the value is the chat history object.
 */
export function chatListToObject(messages: ChatHistoryDbResponse[]): ChatState {
    return messages.reduce((acc, message) => {
        acc[message.id] = message;
        return acc;
    }, {} as ChatState);
}

interface ChatManagerContextProps {
    chatId: string;
    setChatId: (chatId: string) => void;
    answers: [user: string, response: ChatAppResponse][];
    setAnswers: (answers: [user: string, response: ChatAppResponse][]) => void;
    files: string[];
    setFiles: (files: string[]) => void;
    allFiles: AllFiles;
    setAllFiles: (allFiles: AllFiles) => void;
    addToAllFiles: (newFile: string, chatId: string) => void;
    removeFromAllFiles: (filename: string, chatId: string) => void;
    isConfigPanelOpen: boolean;
    setIsConfigPanelOpen: (isConfigPanelOpen: boolean) => void;
    streamedAnswers: [user: string, response: ChatAppResponse][];
    setStreamedAnswers: (streamedAnswers: [user: string, response: ChatAppResponse][]) => void;
    allSidebarChats: ChatState;
    setAllSidebarChats: (chats: ChatState) => void;
    updateSidebarChats: (newChat: ChatHistoryDbResponse) => void;
}

const ChatManagerContext = createContext<ChatManagerContextProps | undefined>(undefined);

export function ChatManagerProvider({ children }: { children: ReactNode }) {
    const [chatId, setChatId] = useState<string>(uuidv4());
    const [answers, setAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const [files, setFiles] = useState<string[]>([]);
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState<boolean>(false);
    const [streamedAnswers, setStreamedAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const [allSidebarChats, setAllSidebarChats] = useState<ChatState>({});
    const [allFiles, setAllFiles] = useState<AllFiles>({});

    /**
     * Updates allSidebarChats with a new chat history object.
     */
    const updateSidebarChats = (newChat: ChatHistoryDbResponse) => {
        setAllSidebarChats(prevChats => ({
            ...prevChats,
            [newChat.id]: newChat
        }));
    };

    /**
     * Updates files with a new uploaded filename for the currently active chat.
     */
    const addToAllFiles = (newFile: string, chatId: string) => {
        const chatFiles = allFiles[chatId] ?? [];
        const updatedFiles = [...chatFiles, newFile];
        setAllFiles(prevFiles => ({
            ...prevFiles,
            [chatId]: updatedFiles
        }));
    };

    /**
     * Removes files with that were deleted from the currently active chat.
     */
    const removeFromAllFiles = (filename: string, chatId: string) => {
        const chatFiles = allFiles[chatId];
        const updatedFiles = chatFiles.filter(file => file !== filename);
        if (updatedFiles.length === 0) {
            setAllFiles(prevFiles => {
                const { [chatId]: _, ...rest } = prevFiles; // seperates chatid from the rest
                return rest;
            });
        } else {
            setAllFiles(prevFiles => ({
                ...prevFiles,
                [chatId]: updatedFiles
            }));
        }
    };

    return (
        <ChatManagerContext.Provider
            value={{
                chatId,
                setChatId,
                answers,
                setAnswers,
                files,
                setFiles,
                allFiles,
                setAllFiles,
                addToAllFiles,
                removeFromAllFiles,
                isConfigPanelOpen,
                setIsConfigPanelOpen,
                streamedAnswers,
                setStreamedAnswers,
                allSidebarChats,
                setAllSidebarChats,
                updateSidebarChats
            }}
        >
            {children}
        </ChatManagerContext.Provider>
    );
}

export const useChatManager = (): ChatManagerContextProps => {
    const context = useContext(ChatManagerContext);
    if (!context) {
        throw new Error("useChatManager must be used within a ChatManagerProvider");
    }
    return context;
};
