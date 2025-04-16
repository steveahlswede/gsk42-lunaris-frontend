import { useMsal } from "@azure/msal-react";
import { useRef, useState } from "react";
import styles from "./ChatHistory.module.css";
import { Stack } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { useChatManager } from "../../../../contextProviderChat";
import { getToken } from "../../../../authConfig";
import { deleteSingleChatHistoryApi, getSingleChatHistoryApi, updateChatHistoryTitleApi } from "../../services/chatHistoryApi";
import { ThreeDotsOptionButton } from "../../../../components/Buttons";
import { DropDownMenu, menuPositionUnderneath, useOpenCloseMenu } from "../../../../components/Menus";
import { ClickableTextItem } from "../../../../components/ClickableTextItem";
import { ChatHistoryDbResponse } from "../../models";
import { useTranslation } from "react-i18next";
import { deleteUploadedFileApi } from "../../../../api";

interface Props {
    pastChat: ChatHistoryDbResponse;
    files: string[];
}

export const ChatHistoryItem = ({ pastChat, files }: Props) => {
    const { t } = useTranslation();
    const { setChatId, setAnswers, setStreamedAnswers, allSidebarChats, setAllSidebarChats } = useChatManager();
    const { instance } = useMsal();
    const chatButtonRef = useRef<HTMLDivElement>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [title, setTitle] = useState(pastChat.title?.replace(/"/g, ""));
    const inputRef = useRef<HTMLInputElement | null>(null);
    const menuRef = useRef<HTMLDivElement>();
    const { toggleLoadPromptMenu, buttonRefDropdownMenu, isDropdownMenuOpen } = useOpenCloseMenu(menuRef);

    const deleteChat = async () => {
        const newChats = { ...allSidebarChats };
        delete newChats[pastChat.id];
        setAllSidebarChats(newChats);
        const token = await getToken(instance);
        if (!token) {
            throw new Error("No authentication token available");
        }
        const resp = await deleteSingleChatHistoryApi(token, pastChat.id);
        if (!resp.ok) {
            throw new Error(resp.statusText);
        } else {
            files.forEach(file => deleteUploadedFileApi(file, pastChat.id, token));
        }
    };

    const getChatMessages = async () => {
        try {
            const token = await getToken(instance);
            if (!token) {
                throw new Error("No authentication token available");
            }
            const chats = await getSingleChatHistoryApi(token, pastChat.id);
            setAnswers(chats[0].answers);
            setStreamedAnswers(chats[0].answers);
        } catch (error) {
            console.error(error);
        }
    };

    const updateChatTitle = async () => {
        try {
            const token = await getToken(instance);
            if (!token) {
                throw new Error("No authentication token available");
            }
            const updatedChat = await updateChatHistoryTitleApi(token, pastChat.id, title);
            const newChats = { ...allSidebarChats, [pastChat.id]: updatedChat };
            setAllSidebarChats(newChats);
        } catch (error) {
            console.error(error);
        }
    };

    const handleClickOnHistory = async () => {
        await getChatMessages();
        setChatId(pastChat.id);
    };

    // Handle clicking the "Change title" option
    const handleEdit = () => {
        setIsEdit(true);
        setTimeout(() => inputRef.current?.focus(), 0); // Focus on input
    };

    const handleBlurOrEnter = () => {
        setIsEdit(false);
        console.log("Sending title to backend", title);
        updateChatTitle();
    };

    const changeTitleInFrontend = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    return (
        <Stack.Item className={styles.chatHistoryItem}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <Button
                    onClick={isEdit ? undefined : handleClickOnHistory}
                    style={{
                        padding: "0",
                        minWidth: "0",
                        width: "100%",
                        height: "auto",
                        textAlign: "left"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }} ref={chatButtonRef}>
                        <img src="./chat-conversation.svg" alt="Chat Bot Icon" className={styles.chatIcon} />
                        {isEdit ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={title}
                                onChange={changeTitleInFrontend}
                                onBlur={handleBlurOrEnter}
                                onKeyDown={e => e.key === "Enter" && handleBlurOrEnter()}
                                className="border rounded p-1 focus:outline-none"
                            />
                        ) : (
                            <span className={styles.chatHistoryTitle}>{title}</span>
                        )}
                        {files.length > 0 ? <img src="./attachment.svg" alt="File Attachment Icon" className={styles.chatIcon} /> : <></>}
                    </div>
                </Button>
                <ThreeDotsOptionButton toggleLoadPromptMenu={toggleLoadPromptMenu} buttonRefDropdownMenu={buttonRefDropdownMenu} />
            </div>
            {isDropdownMenuOpen ? (
                <DropDownMenu
                    className={styles.chatItemOptions}
                    menuRef={menuRef}
                    getMenuPosition={() => menuPositionUnderneath(buttonRefDropdownMenu.current)}
                >
                    <ClickableTextItem onClick={handleEdit} key={`${pastChat.id}_update`} className={styles.chatHistoryChangeTitle}>
                        {t("updateTitle")}
                    </ClickableTextItem>

                    <ClickableTextItem
                        onClick={() => {
                            deleteChat().catch(error => console.error("Error deleting chat:", error));
                        }}
                        key={`${pastChat.id}_delete`}
                        className={styles.chatHistoryDeleteButton}
                    >
                        {t("delete")}
                    </ClickableTextItem>
                </DropDownMenu>
            ) : (
                <></>
            )}
        </Stack.Item>
    );
};
