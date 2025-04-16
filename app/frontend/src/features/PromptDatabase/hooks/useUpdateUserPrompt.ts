import { useRef, useState } from "react";
import { addUserPromptsApi, deleteUserPromptsApi } from "../services/promptsApi";
import { getToken } from "../../../authConfig";
import { IPublicClientApplication } from "@azure/msal-browser";

export const useUpdateUserPrompts = (instance: IPublicClientApplication, reFetchPrompts: (promptType: string) => void) => {
    const [openSavePromptMenu, setOpenSavePromptMenu] = useState(false);
    const savePromptButtonRef = useRef<HTMLButtonElement | null>(null);

    const handleSavePrompt = async (promptName: string, promptText: string) => {
        const idToken = await getToken(instance);
        if (idToken) {
            console.log("Saving prompt and refetching user prompts");
            await addUserPromptsApi(idToken, promptText, promptName);
            reFetchPrompts("user");
        } else {
            throw new Error("No authentication token available while saving prompt");
        }
        setOpenSavePromptMenu(false);
    };

    const deleteUserPrompt = async (prompt_id: string) => {
        const token = await getToken(instance);
        if (!token) {
            throw new Error("No authentication token available");
        }
        const resp = await deleteUserPromptsApi(token, prompt_id);
        if (!resp.ok) {
            throw new Error(resp.statusText);
        }
        reFetchPrompts("user");
        console.log("Done deletingg");
    };

    return { savePromptButtonRef, openSavePromptMenu, setOpenSavePromptMenu, handleSavePrompt, deleteUserPrompt };
};
