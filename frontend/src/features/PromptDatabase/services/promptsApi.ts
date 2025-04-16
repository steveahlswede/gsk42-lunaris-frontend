import { getHeaders } from "../../../api/api";
import { PromptsDbResponse } from "../models";

export async function getPromptsApi(idToken: string, promptsType: string): Promise<PromptsDbResponse[]> {
    if (!["global", "user"].includes(promptsType)) {
        throw new Error(`Invalid prompt type: ${promptsType}`);
    }
    const headers = await getHeaders(idToken);
    console.log("Making call to prompts API");
    console.log(promptsType);
    const response = await fetch(`/${promptsType}_prompts/items`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });
    console.log(`Got prompt response ${response}`);

    if (!response.ok) {
        throw new Error(`Getting ${promptsType} prompts failed: ${response.statusText}`);
    }

    const dataResponse: PromptsDbResponse[] = await response.json();
    console.log("Sending back prompts");
    return dataResponse;
}

export async function addUserPromptsApi(idToken: string, prompt: string, title: string): Promise<PromptsDbResponse[]> {
    const headers = await getHeaders(idToken);
    const id = await generateHash(prompt);

    const response = await fetch(`/user_prompts/add`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, prompt })
    });

    if (!response.ok) {
        throw new Error(`Adding new prompt failed: ${response.statusText}`);
    }

    const dataResponse = await response.json();
    return dataResponse;
}

export async function deleteUserPromptsApi(idToken: string, promptId: string): Promise<Response> {
    const headers = await getHeaders(idToken);

    const response = await fetch(`/user_prompts/delete/${promptId}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Deleting user prompt failed: ${response.statusText}`);
    }
    return response;
}

const generateHash = async (inputString: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
};
