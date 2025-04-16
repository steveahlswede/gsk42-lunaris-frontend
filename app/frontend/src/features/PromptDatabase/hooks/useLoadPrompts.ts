import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { PromptsDbResponse } from "../models";
import { getToken } from "../../../authConfig";
import { getPromptsApi } from "../services/promptsApi";
import { IPublicClientApplication } from "@azure/msal-browser";
import { useTranslation } from "react-i18next";

export const usePromptPlaceholder = (question: string, setQuestion: Dispatch<SetStateAction<string>>) => {
    const { t } = useTranslation();
    const [placeholder, setPlaceholder] = useState<string>(t("defaultExamples.placeholder"));
    const [previousQuestion, setPreviousQuestion] = useState<string>("");

    const handlePromptClick = (prompt: string) => {
        setQuestion(prompt);
        setPreviousQuestion("");
    };

    const handlePromptHovered = (prompt: string) => {
        if (question) {
            setPreviousQuestion(question);
        }
        setQuestion("");
        setPlaceholder(prompt);
    };

    const handlePromptUnhovered = () => {
        if (previousQuestion) {
            setQuestion(previousQuestion);
        }
        setPlaceholder(t("defaultExamples.placeholder"));
    };

    return { placeholder, setPlaceholder, setPreviousQuestion, handlePromptClick, handlePromptHovered, handlePromptUnhovered };
};

export const useGetPrompts = (instance: IPublicClientApplication, loggedIn: boolean) => {
    const [onlyGlobalPrompts, setOnlyGlobalPrompts] = useState<PromptsDbResponse[]>([]);
    const [onlyUserPrompts, setOnlyUserPrompts] = useState<PromptsDbResponse[]>([]);

    const getPrompts = async (promptType: string) => {
        console.log("Getting prompts");
        console.log(promptType);
        const idToken = await getToken(instance);
        if (idToken) {
            const prompts = await getPromptsApi(idToken, promptType);
            prompts.forEach(obj => {
                obj["source"] = promptType;
            });
            if (promptType === "global") {
                setOnlyGlobalPrompts(prompts);
            } else if (promptType === "user") {
                setOnlyUserPrompts(prompts);
            } else {
                throw new Error("Invalid prompt type");
            }
        } else {
            throw new Error("No authentication token available");
        }
    };

    useEffect(() => {
        if (loggedIn) {
            console.log("Getting logged in prompts", loggedIn);
            getPrompts("global");
            getPrompts("user");
        }
    }, [loggedIn]);

    return { onlyGlobalPrompts, onlyUserPrompts, getPrompts };
};
