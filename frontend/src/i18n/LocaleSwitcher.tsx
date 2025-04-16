import { useTranslation } from "react-i18next";
import { IDropdownOption, Dropdown } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";

import { supportedLngs } from "./config";
import styles from "./LocaleSwitcher.module.css";

interface Props {
    onLanguageChange: (language: string) => void;
}

// Mapping Sprachcode -> Ländercode (Flaggen)
const languageToCountryCode: Record<string, string> = {
    en: "us",
    de: "de",
    fr: "fr"
    // Füge weitere Sprachcodes hier hinzu
};

export const LocaleSwitcher = ({ onLanguageChange }: Props) => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (_ev: React.FormEvent<HTMLDivElement>, option?: IDropdownOption<string> | undefined) => {
        onLanguageChange(option?.data || i18n.language);
    };

    const localeSwitcherId = useId("localSwitcher");
    const { t } = useTranslation();

    // Aktueller Ländercode für die Flagge
    const currentCountryCode = languageToCountryCode[i18n.language] || i18n.language;

    return (
        <div className={styles.localeSwitcher}>
            <img src={`https://flagcdn.com/h40/${currentCountryCode}.png`} alt={`${i18n.language} flag`} className={styles.localeFlag} />
            <Dropdown
                id={localeSwitcherId}
                selectedKey={i18n.language}
                options={Object.entries(supportedLngs).map(([code, details]) => ({
                    key: code,
                    text: details.name,
                    selected: code === i18n.language,
                    data: code
                }))}
                onChange={handleLanguageChange}
                ariaLabel={t("labels.languagePicker")}
                placeholder={t("labels.selectLanguage")}
                className={styles.customDropdown}
            />
        </div>
    );
};
