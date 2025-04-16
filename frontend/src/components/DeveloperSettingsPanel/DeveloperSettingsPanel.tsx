import { Checkbox, Panel, DefaultButton, TextField, ITextFieldProps, ICheckboxProps } from "@fluentui/react";
import { TokenClaimsDisplay } from "../../components/TokenClaimsDisplay";
import { GPT4VSettings } from "../../components/GPT4VSettings";
import { VectorSettings } from "../../components/VectorSettings";
import { useLogin, requireAccessControl } from "../../authConfig";
import { HelpCallout } from "../../components/HelpCallout";
import { t } from "i18next";
import styles from "./DeveloperSettingsPanel.module.css";
import { useId } from "@fluentui/react-hooks";
import { Dispatch, SetStateAction, useContext } from "react";
import { Config, gptModelSettings, RetrievalMode, VectorFieldOptions } from "../../api";
import { LoginContext } from "../../loginContext";

interface DeveloperSettingsProps {
    isConfigPanelOpen: boolean;
    gptConfig: gptModelSettings;
    optionsConfig: Config;
    retrievalMode: RetrievalMode;

    setIsConfigPanelOpen: (isOpen: boolean) => void;
    setChatConfig: Dispatch<SetStateAction<Config>>;
    updatePropertyGptConfig: <K extends keyof gptModelSettings>(key: K, value: gptModelSettings[K]) => void;
}

export const DeveloperSettings = (props: DeveloperSettingsProps) => {
    const { loggedIn } = useContext(LoginContext);
    const promptTemplateId = useId("promptTemplate");
    const promptTemplateFieldId = useId("promptTemplateField");
    const temperatureId = useId("temperature");
    const temperatureFieldId = useId("temperatureField");
    const seedId = useId("seed");
    const seedFieldId = useId("seedField");
    const searchScoreId = useId("searchScore");
    const searchScoreFieldId = useId("searchScoreField");
    const rerankerScoreId = useId("rerankerScore");
    const rerankerScoreFieldId = useId("rerankerScoreField");
    const retrieveCountId = useId("retrieveCount");
    const retrieveCountFieldId = useId("retrieveCountField");
    const excludeCategoryId = useId("excludeCategory");
    const excludeCategoryFieldId = useId("excludeCategoryField");
    const semanticRankerId = useId("semanticRanker");
    const semanticRankerFieldId = useId("semanticRankerField");
    const semanticCaptionsId = useId("semanticCaptions");
    const semanticCaptionsFieldId = useId("semanticCaptionsField");
    const suggestFollowupQuestionsId = useId("suggestFollowupQuestions");
    const suggestFollowupQuestionsFieldId = useId("suggestFollowupQuestionsField");
    const useOidSecurityFilterId = useId("useOidSecurityFilter");
    const useOidSecurityFilterFieldId = useId("useOidSecurityFilterField");
    const useGroupsSecurityFilterId = useId("useGroupsSecurityFilter");
    const useGroupsSecurityFilterFieldId = useId("useGroupsSecurityFilterField");
    const shouldStreamId = useId("shouldStream");
    const shouldStreamFieldId = useId("shouldStreamField");

    const onUseSemanticRankerChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        props.setChatConfig(prevConfig => ({
            ...prevConfig,
            showSemanticRankerOption: !!checked
        }));
    };

    return (
        <Panel
            headerText={t("labels.headerText")}
            isOpen={props.isConfigPanelOpen}
            isBlocking={false}
            onDismiss={() => props.setIsConfigPanelOpen(false)}
            closeButtonAriaLabel={t("labels.closeButton")}
            onRenderFooterContent={() => <DefaultButton onClick={() => props.setIsConfigPanelOpen(false)}>{t("labels.closeButton")}</DefaultButton>}
            isFooterAtBottom={true}
        >
            <TextField
                id={promptTemplateFieldId}
                className={styles.chatSettingsSeparator}
                defaultValue={props.gptConfig.promptTemplate}
                label={t("labels.promptTemplate")}
                multiline
                autoAdjustHeight
                onChange={(_ev?: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
                    props.updatePropertyGptConfig("promptTemplate", newValue || "");
                }}
                aria-labelledby={promptTemplateId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={promptTemplateId} fieldId={promptTemplateFieldId} helpText={t("helpTexts.promptTemplate")} label={props?.label} />
                )}
            />

            <TextField
                id={temperatureFieldId}
                className={styles.chatSettingsSeparator}
                label={t("labels.temperature")}
                type="number"
                min={0}
                max={1}
                step={0.1}
                defaultValue={props.gptConfig.temperature.toString()}
                onChange={(_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
                    props.updatePropertyGptConfig("temperature", parseFloat(newValue || "0"));
                }}
                aria-labelledby={temperatureId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={temperatureId} fieldId={temperatureFieldId} helpText={t("helpTexts.temperature")} label={props?.label} />
                )}
            />

            <TextField
                id={seedFieldId}
                className={styles.chatSettingsSeparator}
                label="Seed"
                type="text"
                defaultValue={props.gptConfig.seed?.toString() || ""}
                onChange={(_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
                    props.updatePropertyGptConfig("seed", parseInt(newValue || ""));
                }}
                aria-labelledby={seedId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={seedId} fieldId={seedFieldId} helpText={t("helpTexts.seed")} label={props?.label} />
                )}
            />

            <TextField
                id={searchScoreFieldId}
                className={styles.chatSettingsSeparator}
                label={t("labels.minimumSearchScore")}
                type="number"
                min={0}
                step={0.01}
                defaultValue={props.gptConfig.minimumSearchScore.toString()}
                onChange={(_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
                    props.updatePropertyGptConfig("minimumSearchScore", parseFloat(newValue || "0"));
                }}
                aria-labelledby={searchScoreId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={searchScoreId} fieldId={searchScoreFieldId} helpText={t("helpTexts.searchScore")} label={props?.label} />
                )}
            />

            <TextField
                id={rerankerScoreFieldId}
                className={styles.chatSettingsSeparator}
                label={t("labels.minimumRerankerScore")}
                type="number"
                min={1}
                max={4}
                step={0.1}
                defaultValue={props.gptConfig.minimumRerankerScore.toString()}
                onChange={(_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
                    props.updatePropertyGptConfig("minimumRerankerScore", parseFloat(newValue || "0"));
                }}
                aria-labelledby={rerankerScoreId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={rerankerScoreId} fieldId={rerankerScoreFieldId} helpText={t("helpTexts.rerankerScore")} label={props?.label} />
                )}
            />

            <TextField
                id={retrieveCountFieldId}
                className={styles.chatSettingsSeparator}
                label={t("labels.retrieveCount")}
                type="number"
                min={1}
                max={50}
                defaultValue={props.gptConfig.retrieveCount.toString()}
                onChange={(_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
                    props.updatePropertyGptConfig("retrieveCount", parseInt(newValue || "3"));
                }}
                aria-labelledby={retrieveCountId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={retrieveCountId} fieldId={retrieveCountFieldId} helpText={t("helpTexts.retrieveNumber")} label={props?.label} />
                )}
            />

            <TextField
                id={excludeCategoryFieldId}
                className={styles.chatSettingsSeparator}
                label={t("labels.excludeCategory")}
                defaultValue={props.gptConfig.excludeCategory}
                onChange={(_ev?: React.FormEvent, newValue?: string) => {
                    props.updatePropertyGptConfig("excludeCategory", newValue || "");
                }}
                aria-labelledby={excludeCategoryId}
                onRenderLabel={(props: ITextFieldProps | undefined) => (
                    <HelpCallout labelId={excludeCategoryId} fieldId={excludeCategoryFieldId} helpText={t("helpTexts.excludeCategory")} label={props?.label} />
                )}
            />

            <Checkbox
                id={semanticRankerFieldId}
                className={styles.chatSettingsSeparator}
                checked={props.optionsConfig.useSemanticRanker}
                label={t("labels.useSemanticRanker")}
                onChange={onUseSemanticRankerChange}
                aria-labelledby={semanticRankerId}
                onRenderLabel={(props: ICheckboxProps | undefined) => (
                    <HelpCallout
                        labelId={semanticRankerId}
                        fieldId={semanticRankerFieldId}
                        helpText={t("helpTexts.useSemanticReranker")}
                        label={props?.label}
                    />
                )}
            />

            <Checkbox
                id={semanticCaptionsFieldId}
                className={styles.chatSettingsSeparator}
                checked={props.gptConfig.useSemanticCaptions}
                label={t("labels.useSemanticCaptions")}
                onChange={(_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                    props.updatePropertyGptConfig("useSemanticCaptions", !!checked);
                }}
                disabled={!props.optionsConfig.useSemanticRanker}
                aria-labelledby={semanticCaptionsId}
                onRenderLabel={(props: ICheckboxProps | undefined) => (
                    <HelpCallout
                        labelId={semanticCaptionsId}
                        fieldId={semanticCaptionsFieldId}
                        helpText={t("helpTexts.useSemanticCaptions")}
                        label={props?.label}
                    />
                )}
            />

            <Checkbox
                id={suggestFollowupQuestionsFieldId}
                className={styles.chatSettingsSeparator}
                checked={props.gptConfig.useSuggestFollowupQuestions}
                label={t("labels.useSuggestFollowupQuestions")}
                onChange={(_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                    props.updatePropertyGptConfig("useSuggestFollowupQuestions", !!checked);
                }}
                aria-labelledby={suggestFollowupQuestionsId}
                onRenderLabel={(props: ICheckboxProps | undefined) => (
                    <HelpCallout
                        labelId={suggestFollowupQuestionsId}
                        fieldId={suggestFollowupQuestionsFieldId}
                        helpText={t("helpTexts.suggestFollowupQuestions")}
                        label={props?.label}
                    />
                )}
            />

            {props.optionsConfig.showGPT4VOptions && (
                <GPT4VSettings
                    gpt4vInputs={props.gptConfig.gpt4vInput}
                    isUseGPT4V={props.gptConfig.useGPT4V}
                    updateUseGPT4V={useGPT4V => {
                        props.updatePropertyGptConfig("useGPT4V", useGPT4V);
                    }}
                    updateGPT4VInputs={inputs => {
                        props.updatePropertyGptConfig("gpt4vInput", inputs);
                    }}
                />
            )}

            {props.optionsConfig.showVectorOption && (
                <VectorSettings
                    defaultRetrievalMode={props.retrievalMode}
                    showImageOptions={props.gptConfig.useGPT4V && props.optionsConfig.showGPT4VOptions}
                    updateVectorFields={(options: VectorFieldOptions[]) => props.updatePropertyGptConfig("vectorFieldList", options)}
                    updateRetrievalMode={(newRetrievalMode: RetrievalMode) => {
                        props.setChatConfig(prevConfig => ({
                            ...prevConfig,
                            showVectorOption: newRetrievalMode === RetrievalMode.Hybrid
                        }));
                    }}
                />
            )}

            {useLogin && (
                <>
                    <Checkbox
                        id={useOidSecurityFilterFieldId}
                        className={styles.chatSettingsSeparator}
                        checked={props.gptConfig.useOidSecurityFilter || requireAccessControl}
                        label={t("labels.useOidSecurityFilter")}
                        disabled={!loggedIn || requireAccessControl}
                        onChange={(_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                            props.updatePropertyGptConfig("useOidSecurityFilter", !!checked);
                        }}
                        aria-labelledby={useOidSecurityFilterId}
                        onRenderLabel={(props: ICheckboxProps | undefined) => (
                            <HelpCallout
                                labelId={useOidSecurityFilterId}
                                fieldId={useOidSecurityFilterFieldId}
                                helpText={t("helpTexts.useOidSecurityFilter")}
                                label={props?.label}
                            />
                        )}
                    />
                    <Checkbox
                        id={useGroupsSecurityFilterFieldId}
                        className={styles.chatSettingsSeparator}
                        checked={props.gptConfig.useGroupsSecurityFilter || requireAccessControl}
                        label={t("labels.useGroupsSecurityFilter")}
                        disabled={!loggedIn || requireAccessControl}
                        onChange={(_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                            props.updatePropertyGptConfig("useGroupsSecurityFilter", !!checked);
                        }}
                        aria-labelledby={useGroupsSecurityFilterId}
                        onRenderLabel={(props: ICheckboxProps | undefined) => (
                            <HelpCallout
                                labelId={useGroupsSecurityFilterId}
                                fieldId={useGroupsSecurityFilterFieldId}
                                helpText={t("helpTexts.useGroupsSecurityFilter")}
                                label={props?.label}
                            />
                        )}
                    />
                </>
            )}

            <Checkbox
                id={shouldStreamFieldId}
                className={styles.chatSettingsSeparator}
                checked={props.gptConfig.shouldStream}
                label={t("labels.shouldStream")}
                onChange={(_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                    props.updatePropertyGptConfig("shouldStream", !!checked);
                }}
                aria-labelledby={shouldStreamId}
                onRenderLabel={(props: ICheckboxProps | undefined) => (
                    <HelpCallout labelId={shouldStreamId} fieldId={shouldStreamFieldId} helpText={t("helpTexts.streamChat")} label={props?.label} />
                )}
            />

            {useLogin && <TokenClaimsDisplay />}
        </Panel>
    );
};
