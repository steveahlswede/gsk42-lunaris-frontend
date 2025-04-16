import { renderHook, act } from "@testing-library/react";
import { useChatHistory } from "./useChatHistory";
import { ChatHistoryDbResponse, HistoryRetrievedCodes } from "../models";
import { getCompleteChatHistorySingleUserApi } from "../services/chatHistoryApi";
import { getToken } from "../../../authConfig";

vi.mock("../services/chatHistoryApi");
vi.mock("../../../contextProviderChat");
vi.mock("../../../authConfig", () => ({
    getToken: vi.fn()
}));

describe("useChatHistory", () => {
    const setAllSidebarChats = vi.fn();
    const setAllFiles = vi.fn();
    const instance = { getToken: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return initial state", () => {
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        expect(result.current).toEqual({
            getChatsOfUser: expect.any(Function),
            categorizeChats: expect.any(Function),
            historyRetrieved: HistoryRetrievedCodes.PENDING,
            pastChatsCategorized: undefined
        });
    });

    it("should call getCompleteChatHistorySingleUserApi when getChatsOfUser is called", async () => {
        const token = "token";
        vi.mocked(getToken).mockResolvedValue(token);
        vi.mocked(getCompleteChatHistorySingleUserApi).mockResolvedValue([]);
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        await act(() => result.current.getChatsOfUser());
        expect(getCompleteChatHistorySingleUserApi).toHaveBeenCalledTimes(1);
        expect(getCompleteChatHistorySingleUserApi).toHaveBeenCalledWith(token);
    });

    it("should set historyRetrieved to SUCCESS when getChatsOfUser has data and no error", async () => {
        const token = "token";
        const returnedData: ChatHistoryDbResponse[] = [
            {
                id: "abc",
                title: "title",
                _ts: 1234542
            }
        ];
        instance.getToken.mockResolvedValue(token);
        vi.mocked(getCompleteChatHistorySingleUserApi).mockResolvedValue(returnedData);
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        await act(() => result.current.getChatsOfUser());
        expect(result.current.historyRetrieved).toBe(HistoryRetrievedCodes.SUCCESS);
    });

    it("should set historyRetrieved to SUCCESS_EMPTY when getChatsOfUser has no error but also no data", async () => {
        const token = "token";
        const returnedData: ChatHistoryDbResponse[] = [];
        instance.getToken.mockResolvedValue(token);
        vi.mocked(getCompleteChatHistorySingleUserApi).mockResolvedValue(returnedData);
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        await act(() => result.current.getChatsOfUser());
        expect(result.current.historyRetrieved).toBe(HistoryRetrievedCodes.SUCCESS_EMPTY);
    });

    it("should set historyRetrieved to FAILED when getChatsOfUser fails", async () => {
        const token = "token";
        instance.getToken.mockResolvedValue(token);
        vi.mocked(getCompleteChatHistorySingleUserApi).mockRejectedValue(new Error("error"));
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        await act(() => result.current.getChatsOfUser());
        expect(result.current.historyRetrieved).toBe(HistoryRetrievedCodes.FAILED);
    });

    it("should categorize chats when categorizeChats is called", () => {
        const chats: ChatHistoryDbResponse[] = [];
        const { result } = renderHook(() => useChatHistory(setAllSidebarChats, setAllFiles));
        act(() => result.current.categorizeChats(chats));
        expect(result.current.pastChatsCategorized).toBeDefined();
    });
});
