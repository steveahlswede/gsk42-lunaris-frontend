import { useEffect, useContext, useRef } from "react";
import { Stack } from "@fluentui/react";
import { useTranslation } from "react-i18next";

import styles from "./QuestionInput.module.css";
import { SpeechInput } from "./SpeechInput";
import { LoginContext } from "../../loginContext";
import { requireLogin } from "../../authConfig";
import { PromptButton, sendPromptDerWoche } from "../../features/PromptDatabase/components/PromptButton";

interface Props {
    onSend: (question: string) => void;
    disabled: boolean;
    initQuestion?: string;
    handlePlaceholder: (placeholder: string) => void;
    placeholder: string;
    clearOnSend?: boolean;
    showSpeechInput?: boolean;
    toggleLoadPromptMenu: () => void;
    loadPromptButtonRef: React.RefObject<HTMLButtonElement>;
    toggleSavePromptMenu: () => void;
    savePromptButtonRef: React.RefObject<HTMLButtonElement>;
    questionHandler: (question: string) => void;
    question: string;
}

export const QuestionInput = ({
    onSend,
    disabled,
    handlePlaceholder,
    placeholder,
    clearOnSend,
    initQuestion,
    showSpeechInput,
    toggleLoadPromptMenu,
    loadPromptButtonRef,
    toggleSavePromptMenu,
    savePromptButtonRef,
    questionHandler,
    question
}: Props) => {
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const { loggedIn } = useContext(LoginContext);
    const { t } = useTranslation();

    useEffect(() => {
        initQuestion && questionHandler(initQuestion);
    }, [initQuestion]);

    useEffect(() => {
        // Dynamisch die Höhe des Textarea und des Containers anpassen
        if (textAreaRef.current) {
            const textarea = textAreaRef.current;
            textarea.style.height = "auto";
            textarea.style.height = Math.min(textarea.scrollHeight, parseFloat(textarea.style.maxHeight)) + "px";
        }
    }, [question]);

    const sendQuestion = () => {
        if (disabled || !question.trim()) {
            return;
        }

        onSend(question);

        if (clearOnSend) {
            questionHandler("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (!newValue) {
            questionHandler("");
        } else if (newValue.length <= 10000) {
            questionHandler(newValue);
        }
    };

    const disableRequiredAccessControl = requireLogin && !loggedIn;

    useEffect(() => {
        if (!loggedIn) {
            handlePlaceholder("Please login to continue...");
        } else {
            handlePlaceholder(t("defaultExamples.placeholder"));
        }
    }, [loggedIn]);

    return (
        <Stack horizontal={false} className={styles.questionInputContainer} style={{ height: "auto" }}>
            <textarea
                ref={textAreaRef}
                className={styles.questionInputTextArea}
                disabled={disableRequiredAccessControl}
                placeholder={placeholder}
                value={question}
                onChange={e => onQuestionChange(e as any, e.target.value)}
                onKeyDown={onEnterPress}
                rows={1}
                style={{
                    resize: "none", // Verhindert manuelles Resizing
                    overflowY: "auto", // Scrollen aktivieren, wenn Inhalt größer ist
                    maxHeight: "200px" // Maximalhöhe auf 400px begrenzen
                }}
            />
            <div className={styles.questionInputButtonsContainer}>
                {loggedIn ? (
                    <>
                        <PromptButton
                            toggleMenu={toggleLoadPromptMenu}
                            buttonRef={loadPromptButtonRef}
                            loggedIn={loggedIn}
                            iconSource="./enter.svg"
                            iconAlt="LoadPromptIcon"
                            text={t("promptButtons.load")}
                        />
                        <PromptButton
                            toggleMenu={toggleSavePromptMenu}
                            buttonRef={savePromptButtonRef}
                            loggedIn={loggedIn}
                            iconSource="./add-text.svg"
                            iconAlt="SavePromptIcon"
                            text={t("promptButtons.save")}
                        />
                        <PromptButton
                            toggleMenu={() => sendPromptDerWoche(question)}
                            loggedIn={loggedIn}
                            iconSource="./send2.svg"
                            iconAlt="PromptDerWoche"
                            text={t("promptButtons.woche")}
                        />
                    </>
                ) : (
                    <></>
                )}
            </div>
            {showSpeechInput && <SpeechInput updateQuestion={questionHandler} />}
        </Stack>
    );
};
