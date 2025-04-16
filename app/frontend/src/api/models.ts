export const enum RetrievalMode {
    Hybrid = "hybrid",
    Vectors = "vectors",
    Text = "text"
}

export const enum GPT4VInput {
    TextAndImages = "textAndImages",
    Images = "images",
    Texts = "texts"
}

export const enum VectorFieldOptions {
    Embedding = "embedding",
    ImageEmbedding = "imageEmbedding",
    Both = "both"
}

export type ChatAppRequestOverrides = {
    retrieval_mode?: RetrievalMode;
    semantic_ranker?: boolean;
    semantic_captions?: boolean;
    exclude_category?: string;
    seed?: number;
    top?: number;
    temperature?: number;
    minimum_search_score?: number;
    minimum_reranker_score?: number;
    prompt_template?: string;
    suggest_followup_questions?: boolean;
    use_oid_security_filter?: boolean;
    use_groups_security_filter?: boolean;
    use_gpt4v?: boolean;
    gpt4v_input?: GPT4VInput;
    vector_fields: VectorFieldOptions[];
};

export type ResponseMessage = {
    content: string;
    role: string;
};

export type Thoughts = {
    title: string;
    description: any; // It can be any output from the api
    props?: { [key: string]: string };
};

export type ResponseContext = {
    data_points: string[];
    followup_questions: string[] | null;
    thoughts: Thoughts[];
};

export type ChatAppResponseOrError = {
    message: ResponseMessage;
    delta: ResponseMessage;
    context: ResponseContext;
    session_state: any;
    error?: string;
};

export type ChatAppResponse = {
    message: ResponseMessage;
    delta: ResponseMessage;
    context: ResponseContext;
    session_state: any;
};

export type ChatAppRequestContext = {
    overrides?: ChatAppRequestOverrides;
    chatId: string;
};

export type ChatAppRequest = {
    messages: ResponseMessage[];
    context?: ChatAppRequestContext;
    session_state: any;
};

export type Config = {
    showGPT4VOptions: boolean;
    useSemanticRanker: boolean;
    showVectorOption: boolean;
    showUserUpload: boolean;
    showSpeechInput: boolean;
    showSpeechOutputBrowser: boolean;
    showSpeechOutputAzure: boolean;
};

export type gptModelSettings = {
    temperature: number;
    seed: number | null;
    minimumSearchScore: number;
    minimumRerankerScore: number;
    retrieveCount: number;
    excludeCategory: string;
    useSemanticCaptions: boolean;
    useSuggestFollowupQuestions: boolean;
    useOidSecurityFilter: boolean;
    useGroupsSecurityFilter: boolean;
    shouldStream: boolean;
    useGPT4V: boolean;
    gpt4vInput: GPT4VInput;
    vectorFieldList: VectorFieldOptions[];
    promptTemplate: string;
};

export type SimpleAPIResponse = {
    message?: string;
    filename?: string;
};

export type HistoryApiResponse = {
    id: string;
    entra_oid: string;
    title: string;
    answers: any;
    timestamp: number;
};

export type AdminUserResponse = {
    user: string;
};
