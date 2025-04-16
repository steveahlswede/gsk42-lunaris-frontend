export enum PromptMenuChoices {
    GLOBAL = "Global",
    USER = "User"
}

export interface PromptDocument {
    id: string;
    title: string;
    prompt: string;
    source: string;
}

export type PromptsDbResponse = {
    id: string;
    title: string;
    prompt: string;
    _ts: number;
    source: string;
};
