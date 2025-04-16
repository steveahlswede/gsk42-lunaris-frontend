import { useEffect, useState } from "react";
import { Config, configApi, RetrievalMode } from "../api";

export const useChatConfig = () => {
    const [chatConfig, setChatConfig] = useState<Config>({
        showGPT4VOptions: false,
        useSemanticRanker: false,
        showVectorOption: false,
        showUserUpload: false,
        showSpeechInput: false,
        showSpeechOutputBrowser: false,
        showSpeechOutputAzure: false
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await configApi();
                setChatConfig(config);
            } catch (error) {
                console.error(`Error fetching model config: ${error}`);
            }
        };
        fetchConfig();
    }, []);

    var retrievalMode = !chatConfig.showVectorOption ? RetrievalMode.Text : RetrievalMode.Hybrid;

    return {
        retrievalMode,
        chatConfig,
        setChatConfig
    };
};
