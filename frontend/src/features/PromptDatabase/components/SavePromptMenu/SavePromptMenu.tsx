import { useEffect, useState } from "react";
import styles from "./SavePromptMenu.module.css";
import { useTranslation } from "react-i18next";

interface MenuProps {
    onClose: () => void;
    onSave: (promptName: string, promptText: string) => void;
    reloadUserPrompts: () => void;
}

export const SavePromptMenu = ({ onClose, onSave, reloadUserPrompts }: MenuProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [promptText, setPromptText] = useState("");
    const [saveEnabled, setSaveEnabled] = useState(false);

    const handleSave = () => {
        onSave(name, promptText);
        reloadUserPrompts();
    };

    useEffect(() => {
        if (name && promptText) {
            setSaveEnabled(true);
        } else {
            setSaveEnabled(false);
        }
    }, [name, promptText]);

    return (
        <div className={styles.menuOverlay}>
            <div className={styles.menuContainer}>
                <div className={styles.menuHeader}>
                    <h2>{t("savePrompt.title")}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.menuContent}>
                    <h3>{t("savePrompt.name")}</h3>
                    <input type="text" placeholder={t("savePrompt.namePlaceholder")} className={styles.shortInput} onChange={e => setName(e.target.value)} />

                    <h3>{t("savePrompt.promptHeader")}</h3>
                    <textarea
                        placeholder={t("savePrompt.promptHeaderPlaceholder")}
                        maxLength={100000}
                        className={styles.longInput}
                        onChange={e => setPromptText(e.target.value)}
                    />
                </div>

                <div className={styles.menuFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        {t("savePrompt.cancel")}
                    </button>
                    <button className={`${styles.saveButton} ${saveEnabled ? styles.enabled : styles.disabled}`} onClick={handleSave} disabled={!saveEnabled}>
                        {t("savePrompt.save")}
                    </button>
                </div>
            </div>
        </div>
    );
};
