import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ChatHistory } from "./ChatHistory";
import { LoginContext } from "../../../../loginContext";
import { useChatManager } from "../../../../contextProviderChat";
import { adminUserEnvVarApi } from "../../../../api/api";
import { getUsername } from "../../../../authConfig";
import { categorizeTimestamps } from "../../hooks/useChatHistory";
import { ChatHistoryDbResponse } from "../../models";

vi.mock("../../../../contextProviderChat", () => ({
    useChatManager: vi.fn()
}));

vi.mock("../../../../api/api", () => ({
    adminUserEnvVarApi: vi.fn()
}));

vi.mock("../../../../authConfig", () => ({
    getUsername: vi.fn()
}));

const loggedIn = true;
const setLoggedIn = vi.fn();

const chatManagerMockedReturn = {
    chatId: "",
    setChatId: vi.fn(),
    answers: [],
    setAnswers: vi.fn(),
    isConfigPanelOpen: false,
    setIsConfigPanelOpen: vi.fn(),
    streamedAnswers: [],
    setStreamedAnswers: vi.fn(),
    allSidebarChats: {},
    setAllSidebarChats: vi.fn(),
    updateSidebarChats: vi.fn(),
    files: [],
    setFiles: vi.fn(),
    allFiles: {},
    setAllFiles: vi.fn(),
    addToAllFiles: vi.fn(),
    removeFromAllFiles: vi.fn()
};

describe("ChatHistory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets isUserAdmin to true when username matches adminUser", async () => {
        vi.mocked(adminUserEnvVarApi).mockResolvedValue({ user: "adminUser" });
        vi.mocked(getUsername).mockResolvedValue("adminUser");

        vi.mocked(useChatManager).mockReturnValue(chatManagerMockedReturn);

        render(
            <LoginContext.Provider value={{ loggedIn, setLoggedIn }}>
                <ChatHistory />
            </LoginContext.Provider>
        );

        // Wait for state updates
        await waitFor(() => {
            expect(adminUserEnvVarApi).toHaveBeenCalled();
            expect(getUsername).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByRole("button")).toBeInTheDocument();
        });
    });

    it("sets isUserAdmin to false when username does not match adminUser", async () => {
        vi.mocked(adminUserEnvVarApi).mockResolvedValue({ user: "" });
        vi.mocked(getUsername).mockResolvedValue("mustermann@gsk.de");

        vi.mocked(useChatManager).mockReturnValue(chatManagerMockedReturn);

        render(
            <LoginContext.Provider value={{ loggedIn, setLoggedIn }}>
                <ChatHistory />
            </LoginContext.Provider>
        );

        await waitFor(() => {
            expect(adminUserEnvVarApi).toHaveBeenCalled();
            expect(getUsername).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });
    });
});

describe("categorizeTimestamps", () => {
    let now: Date;
    let startOfToday: number;
    let oneDay: number;
    let startOfLastWeek: number;

    beforeEach(() => {
        now = new Date();
        startOfToday = now.setHours(0, 0, 0, 0) / 1000;
        oneDay = 24 * 60 * 60;
        startOfLastWeek = startOfToday - 7 * oneDay;
    });

    it("should categorize timestamps correctly", () => {
        const chatHistory = [{ _ts: startOfToday + 100 }, { _ts: startOfToday - 100 }, { _ts: startOfLastWeek - 100 }, { _ts: startOfLastWeek + 100 }];

        const result = categorizeTimestamps(chatHistory as ChatHistoryDbResponse[]);

        expect(result.today).toHaveLength(1);
        expect(result.lastWeek).toHaveLength(2);
        expect(result.older).toHaveLength(1);
    });

    it("should sort today's chats in descending order", () => {
        const chatHistory = [{ _ts: startOfToday + 100 }, { _ts: startOfToday + 200 }, { _ts: startOfToday + 300 }];

        const result = categorizeTimestamps(chatHistory as ChatHistoryDbResponse[]);

        expect(result.today).toHaveLength(3);
        expect(result.today[0]._ts).toBe(startOfToday + 300);
        expect(result.today[1]._ts).toBe(startOfToday + 200);
        expect(result.today[2]._ts).toBe(startOfToday + 100);
    });

    it("should handle empty input", () => {
        const result = categorizeTimestamps([]);

        expect(result.today).toHaveLength(0);
        expect(result.lastWeek).toHaveLength(0);
        expect(result.older).toHaveLength(0);
    });

    it("should handle all chats from today", () => {
        const chatHistory = [{ _ts: startOfToday + 100 }, { _ts: startOfToday + 200 }, { _ts: startOfToday + 300 }];

        const result = categorizeTimestamps(chatHistory as ChatHistoryDbResponse[]);

        expect(result.today).toHaveLength(3);
        expect(result.lastWeek).toHaveLength(0);
        expect(result.older).toHaveLength(0);
    });

    it("should handle all chats from last week", () => {
        const chatHistory = [{ _ts: startOfLastWeek + 100 }, { _ts: startOfLastWeek + oneDay }, { _ts: startOfToday - 100 }];

        const result = categorizeTimestamps(chatHistory as ChatHistoryDbResponse[]);

        expect(result.today).toHaveLength(0);
        expect(result.lastWeek).toHaveLength(3);
        expect(result.older).toHaveLength(0);
    });

    it("should handle all older chats", () => {
        const chatHistory = [{ _ts: startOfLastWeek - 100 }, { _ts: startOfLastWeek - oneDay }, { _ts: startOfLastWeek - 2 * oneDay }];

        const result = categorizeTimestamps(chatHistory as ChatHistoryDbResponse[]);

        expect(result.today).toHaveLength(0);
        expect(result.lastWeek).toHaveLength(0);
        expect(result.older).toHaveLength(3);
    });
});
