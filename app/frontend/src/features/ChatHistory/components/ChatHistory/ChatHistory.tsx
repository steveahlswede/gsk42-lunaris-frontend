import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useContext } from "react";
import styles from "./ChatHistory.module.css";
import { Stack, Spinner } from "@fluentui/react";
import { ChatHistoryItem } from "./ChatHistoryItem";
import { LoginContext } from "../../../../loginContext";
import { AllFiles, useChatManager } from "../../../../contextProviderChat";
import { adminUserEnvVarApi } from "../../../../api/api";
import { getUsername } from "../../../../authConfig";
import { SettingsButton } from "../../../../components/SettingsButton";
import { useChatHistory } from "../../hooks/useChatHistory";
import { ChatHistoryDbResponse, HistoryRetrievedCodes } from "../../models";

interface HistorySectionProps {
    chats: ChatHistoryDbResponse[];
    sectionTitle: string;
    files: AllFiles;
}

const ChatHistorySection = ({ chats, sectionTitle, files }: HistorySectionProps) => {
    return (
        <div className={styles.chatHistorySection}>
            <p className={styles.chatHistorySectionTitle}>{sectionTitle}</p>
            <Stack tokens={{ childrenGap: 10 }}>
                {chats.map((chat, index) => (
                    <ChatHistoryItem key={chat.id} pastChat={chat} files={files[chat.id] ?? []} />
                ))}
            </Stack>
        </div>
    );
};

export const ChatHistory = () => {
    const { loggedIn } = useContext(LoginContext);
    const { t } = useTranslation();
    const { instance } = useMsal();
    const { allSidebarChats, setAllSidebarChats, allFiles, setAllFiles, setIsConfigPanelOpen, isConfigPanelOpen } = useChatManager();
    const [username, setUsername] = useState("");
    const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
    const { getChatsOfUser, getFilesOfUserChats, categorizeChats, historyRetrieved, pastChatsCategorized } = useChatHistory(setAllSidebarChats, setAllFiles);

    useEffect(() => {
        const checkAdmin = async () => {
            const adminUser = await adminUserEnvVarApi();
            console.log("adminUser: ", adminUser);
            console.log("username: ", username);
            setIsUserAdmin(username === adminUser.user);
        };
        if (username) {
            checkAdmin();
        }
    }, [username]);

    useEffect(() => {
        console.log("IS USER ADMIN changed", isUserAdmin);
    }, [isUserAdmin]);

    useEffect(() => {
        const fetchUsername = async () => {
            setUsername((await getUsername(instance)) ?? "");
        };
        if (loggedIn) {
            console.log("logged in getting username for chat history");
            fetchUsername();
            getChatsOfUser();
            getFilesOfUserChats();
        }
    }, [loggedIn]);

    // when new chats come in (from a user asking a new question in an empty chat) we need to categorize it so it goes to the correct section of the history
    // other potential change in allSidebarChats can come from deleting a chat, in which case we also need to
    useEffect(() => {
        categorizeChats(Object.values(allSidebarChats));
    }, [allSidebarChats]);

    return (
        <div className={styles.containerStyle}>
            <div className={styles.headerCompanyLogoPosition}>
                <img
                    src="https://stchatbothostprodeuw001.blob.core.windows.net/publiccontent/GSK42_Logo_RGB.png"
                    alt="Chat logo in header"
                    className={styles.headerLogo}
                />
            </div>
            <div className={styles.chatsContainer}>
                {historyRetrieved === HistoryRetrievedCodes.SUCCESS && pastChatsCategorized ? (
                    <>
                        {pastChatsCategorized.today.length > 0 ? (
                            <ChatHistorySection sectionTitle={t("chatHistory.today")} chats={pastChatsCategorized.today} files={allFiles} />
                        ) : (
                            <></>
                        )}
                        {pastChatsCategorized.lastWeek.length > 0 ? (
                            <ChatHistorySection sectionTitle={t("chatHistory.lastWeek")} chats={pastChatsCategorized.lastWeek} files={allFiles} />
                        ) : (
                            <></>
                        )}
                        {pastChatsCategorized.older.length > 0 ? (
                            <ChatHistorySection sectionTitle={t("chatHistory.older")} chats={pastChatsCategorized.older} files={allFiles} />
                        ) : (
                            <></>
                        )}
                    </>
                ) : historyRetrieved === HistoryRetrievedCodes.SUCCESS_EMPTY ? (
                    <> </>
                ) : historyRetrieved === HistoryRetrievedCodes.PENDING ? (
                    <>
                        <Spinner style={{ marginTop: "1rem", color: "#00839b" }} label={t("chatHistory.loadingHistory")} />
                    </>
                ) : (
                    <></>
                )}
            </div>
            {isUserAdmin && <SettingsButton className={styles.commandButton} onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} />}
        </div>
    );
};
