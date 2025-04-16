import { useRef, useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet";
import readNDJSONStream from "ndjson-readablestream";
import { v4 as uuidv4 } from "uuid";

import styles from "./Chat.module.css";

import { chatApi, getSpeechApi, ChatAppResponse, ChatAppResponseOrError, ChatAppRequest, ResponseMessage } from "../../api";
import { postChatHistoryApi, updateChatHistoryAnswersApi } from "../../features/ChatHistory/services/chatHistoryApi";
import { onExportExcel, onExportWord } from "../answersToFile";
import { Answer, AnswerError, AnswerLoading } from "../../components/Answer";

import { QuestionInput } from "../../components/QuestionInput";
import { UserChatMessage } from "../../components/UserChatMessage";
import { DeveloperSettings } from "../../components/DeveloperSettingsPanel";
import { AnalysisPanel, AnalysisPanelTabs } from "../../components/AnalysisPanel";

import { ClearChatButton } from "../../components/ClearChatButton";
import { UploadFile } from "../../components/UploadFile";
import { useLogin, getToken } from "../../authConfig";
import { useMsal } from "@azure/msal-react";

import { LoginContext } from "../../loginContext";
import { useOutletContext } from "react-router-dom";
import { useChatManager } from "../../contextProviderChat";
import { marked } from "marked";
import { PromptMenu } from "../../features/PromptDatabase/components/PromptMenu";
import { useMenuSelected } from "../../features/PromptDatabase/hooks/menuSelected";
import { useGetPrompts, usePromptPlaceholder } from "../../features/PromptDatabase/hooks/useLoadPrompts";
import { useUpdateUserPrompts } from "../../features/PromptDatabase/hooks/useUpdateUserPrompt";
import { SavePromptMenu } from "../../features/PromptDatabase/components/SavePromptMenu";
import { useChatConfig } from "../../hooks/useChatConfig";
import { useGptModelConfig } from "../../hooks/useGptModelConfig";
import { menuPositionLeft, menuPositionUnderneath, useOpenCloseMenu } from "../../components/Menus";
let counter = 0;

export const Chat = () => {
    counter++;
    console.log("counter", counter);
    const context = useOutletContext();
    const { instance } = useMsal();
    const { t } = useTranslation();

    const { onChatStart } = useOutletContext<{ onChatStart: (isChatEmpty: boolean) => void }>();
    const menuRef = useRef<HTMLDivElement>();
    const { toggleLoadPromptMenu, buttonRefDropdownMenu, isDropdownMenuOpen } = useOpenCloseMenu(menuRef);

    const lastQuestionRef = useRef<string>("");
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();

    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);

    const [selectedAnswer, setSelectedAnswer] = useState<number>(0);
    const {
        chatId,
        answers,
        streamedAnswers,
        setChatId,
        setAnswers,
        setStreamedAnswers,
        allSidebarChats,
        updateSidebarChats,
        isConfigPanelOpen,
        setIsConfigPanelOpen
    } = useChatManager();
    const { retrievalMode, chatConfig, setChatConfig } = useChatConfig();
    const { gptModelConfig, updateGptModelConfig } = useGptModelConfig();

    const [speechUrls, setSpeechUrls] = useState<(string | null)[]>([]);

    const isPageVisibleRef = useRef(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            isPageVisibleRef.current = !document.hidden;
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const handleAsyncRequest = async (question: string, answers: [string, ChatAppResponse][], responseBody: ReadableStream<any>) => {
        let answer: string = "";
        let askResponse: ChatAppResponse = {} as ChatAppResponse;

        const updateState = (newContent: string) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    answer += newContent;
                    const latestResponse: ChatAppResponse = {
                        ...askResponse,
                        message: { content: answer, role: askResponse.message.role }
                    };
                    setStreamedAnswers([...answers, [question, latestResponse]]);
                    resolve(null);
                }, 33);
            });
        };
        try {
            setIsStreaming(true);
            var runningText = "";
            var maxTextLen = 5;
            for await (const event of readNDJSONStream(responseBody)) {
                if (event["context"] && event["context"]["data_points"]) {
                    event["message"] = event["delta"];
                    askResponse = event as ChatAppResponse;
                } else if (event["delta"]["content"]) {
                    setIsLoading(false);
                    runningText += event["delta"]["content"];
                    // increase maxTextLen based on page visibility bc when off the page JS code gets throttled so start to gather larger chunks of text per update
                    maxTextLen = isPageVisibleRef.current ? 5 : 100;
                    if (runningText.length > maxTextLen) {
                        await updateState(runningText);
                        runningText = "";
                    }
                } else if (event["context"]) {
                    // Update context with new keys from latest event
                    askResponse.context = { ...askResponse.context, ...event["context"] };
                } else if (event["error"]) {
                    throw Error(event["error"]);
                }
            }
            if (runningText.length > 0) {
                await updateState(runningText);
                runningText = "";
            }
        } finally {
            setIsStreaming(false);
        }
        const fullResponse: ChatAppResponse = {
            ...askResponse,
            message: { content: answer, role: askResponse.message.role }
        };
        return fullResponse;
    };

    const client = useLogin ? useMsal().instance : undefined;
    const { loggedIn } = useContext(LoginContext);

    useEffect(() => {
        const updateLastQuestionFromNewlyLoadedChat = () => {
            lastQuestionRef.current = answers?.length > 0 ? answers[answers?.length - 1][0] : "";
        };
        updateLastQuestionFromNewlyLoadedChat();
    }, [chatId]);

    const { onlyGlobalPrompts, onlyUserPrompts, getPrompts } = useGetPrompts(instance, loggedIn);
    const { savePromptButtonRef, openSavePromptMenu, setOpenSavePromptMenu, handleSavePrompt, deleteUserPrompt } = useUpdateUserPrompts(instance, getPrompts);
    const [question, setQuestion] = useState<string>("");
    const { placeholder, setPlaceholder, setPreviousQuestion, handlePromptClick, handlePromptHovered, handlePromptUnhovered } = usePromptPlaceholder(
        question,
        setQuestion
    );

    const makeApiRequest = async (question: string) => {
        console.log("User Question:", question); // Debugging
        lastQuestionRef.current = question;

        error && setError(undefined);
        setIsLoading(true);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);

        const token = client ? await getToken(client) : undefined;

        try {
            const messages: ResponseMessage[] = answers.flatMap(a => [
                { content: a[0], role: "user" },
                { content: a[1].message.content, role: "assistant" }
            ]);

            const request: ChatAppRequest = {
                messages: [...messages, { content: question, role: "user" }],
                context: {
                    overrides: {
                        prompt_template: gptModelConfig.promptTemplate.length === 0 ? undefined : gptModelConfig.promptTemplate,
                        exclude_category: gptModelConfig.excludeCategory.length === 0 ? undefined : gptModelConfig.excludeCategory,
                        top: gptModelConfig.retrieveCount,
                        temperature: gptModelConfig.temperature,
                        minimum_reranker_score: gptModelConfig.minimumRerankerScore,
                        minimum_search_score: gptModelConfig.minimumSearchScore,
                        retrieval_mode: retrievalMode,
                        semantic_ranker: chatConfig.useSemanticRanker,
                        semantic_captions: gptModelConfig.useSemanticCaptions,
                        suggest_followup_questions: gptModelConfig.useSuggestFollowupQuestions,
                        use_oid_security_filter: gptModelConfig.useOidSecurityFilter,
                        use_groups_security_filter: gptModelConfig.useGroupsSecurityFilter,
                        vector_fields: gptModelConfig.vectorFieldList,
                        use_gpt4v: gptModelConfig.useGPT4V,
                        gpt4v_input: gptModelConfig.gpt4vInput,
                        ...(gptModelConfig.seed !== null ? { seed: gptModelConfig.seed } : {})
                    },
                    chatId: chatId
                },
                session_state: answers?.length ? answers[answers?.length - 1][1].session_state : null
            };

            console.log("Request Payload:", request); // Debugging
            const response = await chatApi(request, gptModelConfig.shouldStream, token);
            console.log("Got response from chat api");
            console.log(response);

            if (!response.body) {
                throw Error("No response body");
            }

            if (gptModelConfig.shouldStream) {
                const parsedResponse: ChatAppResponse = await handleAsyncRequest(question, answers, response.body);
                setAnswers([...answers, [question, parsedResponse]]);
            } else {
                const parsedResponse: ChatAppResponseOrError = await response.json();
                if (response.status > 299 || !response.ok) {
                    throw Error(parsedResponse.error || "Unknown error");
                }
                setAnswers([...answers, [question, parsedResponse as ChatAppResponse]]);
            }
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (answers?.length > 0) {
            onChatStart(false);
        }
    }, [answers]);

    const clearChat = () => {
        onChatStart(true); // Informiere das Layout, dass der Chat leer ist
        lastQuestionRef.current = "";
        setChatId("");
        setAnswers([]);
        setStreamedAnswers([]);
        setIsLoading(false);
        setIsStreaming(false);
        setQuestion("");
        setPreviousQuestion("");
        setPlaceholder(t("defaultExamples.placeholder"));
    };

    useEffect(() => {
        const chatsToDb = async () => {
            try {
                const token = client ? await getToken(client) : undefined;
                if (!token) {
                    throw new Error("No authentication token available");
                }
                if (!Object.keys(allSidebarChats).includes(chatId)) {
                    const chat = await postChatHistoryApi(token, chatId, answers);
                    updateSidebarChats(chat);
                } else {
                    console.log("id found in allSidebarChats");
                    console.log(Object.keys(allSidebarChats));
                    console.log(chatId);
                    await updateChatHistoryAnswersApi(token, chatId, answers, allSidebarChats[chatId].title);
                }
            } catch (error) {
                console.error(error);
            }
        };
        if (!chatId) {
            let _chatId = uuidv4();
            console.log("Chat ID:", _chatId);
            setChatId(_chatId);
        }
        if (answers?.length > 0) {
            console.log("updating DB");
            chatsToDb();
        }
    }, [answers]);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    useEffect(() => {
        const chatContainer = chatContainerRef.current;

        const handleScroll = () => {
            if (chatContainer) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainer;
                // Check if user is at the bottom (or very close to it)
                setIsUserAtBottom(scrollHeight - scrollTop <= clientHeight + 1);
            }
        };

        // Attach scroll event listener
        chatContainer?.addEventListener("scroll", handleScroll);

        // Cleanup listener on unmount
        return () => chatContainer?.removeEventListener("scroll", handleScroll);
    }, [streamedAnswers]);

    useEffect(() => {
        chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
    }, [isLoading]);
    useEffect(() => {
        isUserAtBottom ? chatMessageStreamEnd.current?.scrollIntoView({ behavior: "auto" }) : null;
    }, [streamedAnswers]);

    useEffect(() => {
        // Benachrichtige das Layout, wenn der Chat aktiv wird
        if (lastQuestionRef.current) {
            onChatStart(false);
        }
    }, [lastQuestionRef.current]);

    useEffect(() => {
        if (answers && chatConfig.showSpeechOutputAzure) {
            // For each answer that is missing a speech URL, fetch the speech URL
            for (let i = 0; i < answers?.length; i++) {
                if (!speechUrls[i]) {
                    getSpeechApi(answers[i][1].message.content).then(speechUrl => {
                        setSpeechUrls([...speechUrls.slice(0, i), speechUrl, ...speechUrls.slice(i + 1)]);
                    });
                }
            }
        }
    }, [answers]);

    const onCopyAnswer = async (answer: ChatAppResponse) => {
        await navigator.clipboard.writeText(answer.message.content);
    };

    const onShowCitation = (citation: string, index: number) => {
        console.log("index");
        console.log(index);
        if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveCitation(citation);
            setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
        }

        setSelectedAnswer(index);
    };

    const onToggleTab = (tab: AnalysisPanelTabs, index: number) => {
        if (activeAnalysisPanelTab === tab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveAnalysisPanelTab(tab);
        }

        setSelectedAnswer(index);
    };

    const { menuSectionSelected, toggleMenuSection } = useMenuSelected();

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("pageTitle")}</title>
            </Helmet>
            <div className={styles.chatRoot}>
                <div className={styles.chatContainer} style={activeAnalysisPanelTab ? { marginLeft: "1rem", marginRight: "1rem" } : { margin: "0" }}>
                    {!lastQuestionRef.current ? (
                        <div className={styles.chatEmptyState}>
                            <img
                                src="https://stchatbothostprodeuw001.blob.core.windows.net/publiccontent/GSK42_Logo_RGB.png"
                                alt="Chat logo"
                                aria-hidden="true"
                                width="45%"
                                className={styles.gskLogo}
                            />
                            <h1 className={styles.chatEmptyStateSubtitle}>{t("chatEmptyStateSubtitle")}</h1>
                        </div>
                    ) : (
                        <div className={styles.chatMessageStream} ref={chatContainerRef}>
                            {isStreaming &&
                                streamedAnswers.map((streamedAnswer, index) => (
                                    <div key={index}>
                                        <UserChatMessage message={streamedAnswer[0]} />
                                        <div className={styles.chatMessageGpt}>
                                            <Answer
                                                isStreaming={true}
                                                key={index}
                                                answer={streamedAnswer[1]}
                                                isSelected={false}
                                                onExportWordClicked={() => onExportWord(streamedAnswer[1])}
                                                onExportExcelClicked={() => onExportExcel(streamedAnswer[1])}
                                                onCitationClicked={c => onShowCitation(c, index)}
                                                onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                                                onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                                                onCopyClicked={() => onCopyAnswer(streamedAnswer[1])}
                                                onFollowupQuestionClicked={q => makeApiRequest(q)}
                                                showFollowupQuestions={gptModelConfig.useSuggestFollowupQuestions && answers?.length - 1 === index}
                                                showSpeechOutputAzure={chatConfig.showSpeechOutputAzure}
                                                showSpeechOutputBrowser={chatConfig.showSpeechOutputBrowser}
                                                speechUrl={speechUrls[index]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            {!isStreaming &&
                                answers?.map((answer, index) => (
                                    <div key={index}>
                                        <UserChatMessage message={answer[0]} />
                                        <div className={styles.chatMessageGpt}>
                                            <Answer
                                                isStreaming={false}
                                                key={index}
                                                answer={answer[1]}
                                                isSelected={selectedAnswer === index && activeAnalysisPanelTab !== undefined}
                                                onExportWordClicked={() => onExportWord(answer[1])}
                                                onExportExcelClicked={() => onExportExcel(answer[1])}
                                                onCitationClicked={c => onShowCitation(c, index)}
                                                onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                                                onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                                                onCopyClicked={() => onCopyAnswer(answer[1])}
                                                onFollowupQuestionClicked={q => makeApiRequest(q)}
                                                showFollowupQuestions={gptModelConfig.useSuggestFollowupQuestions && answers?.length - 1 === index}
                                                showSpeechOutputAzure={chatConfig.showSpeechOutputAzure}
                                                showSpeechOutputBrowser={chatConfig.showSpeechOutputBrowser}
                                                speechUrl={speechUrls[index]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            {isLoading && (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerLoading />
                                    </div>
                                </>
                            )}
                            {error ? (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                                    </div>
                                </>
                            ) : null}
                            <div ref={chatMessageStreamEnd} />
                        </div>
                    )}

                    <div className={styles.chatInput} style={{ position: !lastQuestionRef.current || activeAnalysisPanelTab ? "static" : "absolute" }}>
                        <div className={styles.commandsContainer}>
                            <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
                            <UploadFile className={styles.commandButton} disabled={!loggedIn} />
                        </div>
                        <QuestionInput
                            clearOnSend
                            handlePlaceholder={setPlaceholder}
                            placeholder={placeholder}
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                            showSpeechInput={chatConfig.showSpeechInput}
                            toggleLoadPromptMenu={toggleLoadPromptMenu}
                            loadPromptButtonRef={buttonRefDropdownMenu}
                            toggleSavePromptMenu={() => {
                                setOpenSavePromptMenu(!openSavePromptMenu);
                            }}
                            savePromptButtonRef={savePromptButtonRef}
                            questionHandler={setQuestion}
                            question={question}
                        />
                    </div>
                    {isDropdownMenuOpen && onlyGlobalPrompts && onlyUserPrompts && (
                        <PromptMenu
                            userPrompts={onlyUserPrompts}
                            globalPrompts={onlyGlobalPrompts}
                            handlePromptClick={handlePromptClick}
                            handlePromptHovered={handlePromptHovered}
                            handlePromptUnhovered={handlePromptUnhovered}
                            menuRef={menuRef}
                            toggleMenuSection={toggleMenuSection}
                            menuSectionSelected={menuSectionSelected}
                            deleteUserPrompt={deleteUserPrompt}
                            getMenuPosition={
                                !lastQuestionRef.current
                                    ? () => menuPositionUnderneath(buttonRefDropdownMenu.current)
                                    : () => menuPositionLeft(buttonRefDropdownMenu.current)
                            }
                        />
                    )}
                    {openSavePromptMenu && (
                        <SavePromptMenu onSave={handleSavePrompt} onClose={() => setOpenSavePromptMenu(false)} reloadUserPrompts={() => getPrompts("user")} />
                    )}
                </div>

                {answers?.length > 0 && activeAnalysisPanelTab && (
                    <AnalysisPanel
                        className={styles.chatAnalysisPanel}
                        activeCitation={activeCitation}
                        onActiveTabChanged={x => onToggleTab(x, selectedAnswer)}
                        citationHeight="810px"
                        answer={answers[selectedAnswer][1]}
                        activeTab={activeAnalysisPanelTab}
                    />
                )}

                <DeveloperSettings
                    isConfigPanelOpen={isConfigPanelOpen}
                    gptConfig={gptModelConfig}
                    optionsConfig={chatConfig}
                    retrievalMode={retrievalMode}
                    setIsConfigPanelOpen={setIsConfigPanelOpen}
                    setChatConfig={setChatConfig}
                    updatePropertyGptConfig={updateGptModelConfig}
                />
            </div>
        </div>
    );
};
