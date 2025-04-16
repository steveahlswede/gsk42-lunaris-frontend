import { useState } from "react";
import { GPT4VInput, gptModelSettings, VectorFieldOptions } from "../api";

export const useGptModelConfig = () => {
    const [gptModelConfig, setGptModelConfig] = useState<gptModelSettings>({
        temperature: 0.3,
        seed: null,
        minimumSearchScore: 0,
        minimumRerankerScore: 0,
        retrieveCount: 3,
        excludeCategory: "",
        useSemanticCaptions: false,
        useSuggestFollowupQuestions: false,
        useOidSecurityFilter: false,
        useGroupsSecurityFilter: false,
        shouldStream: true,
        useGPT4V: false,
        gpt4vInput: GPT4VInput.TextAndImages,
        vectorFieldList: [VectorFieldOptions.Embedding],
        promptTemplate: ""
    });

    const updateGptModelConfig = <K extends keyof gptModelSettings>(key: K, value: gptModelSettings[K]) => {
        setGptModelConfig(prev => ({
            ...prev!,
            [key]: value
        }));
    };

    return { gptModelConfig, setGptModelConfig, updateGptModelConfig };
};
