// SettingsButton.tsx
import React, { useState } from "react";
import { Settings24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { PasswordModal } from "./PasswordModal";
import styles from "./SettingsButton.module.css";
import { t } from "i18next";

interface Props {
    className?: string;
    onClick: () => void;
}

export const SettingsButton = ({ className, onClick }: Props) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleButtonClick = () => {
        setIsModalOpen(true);
    };

    const handlePasswordSubmit = (password: string) => {
        if (password === "GSK1234!") {
            // replace with ne password
            setIsModalOpen(false);
            onClick();
        } else {
            alert("Falsches Passwort");
        }
    };

    return (
        <div className={`${styles.container} ${className ?? ""}`}>
            <Button icon={<Settings24Regular />} onClick={handleButtonClick}>
                {t("developerSettings")}
            </Button>
            <PasswordModal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} onPasswordSubmit={handlePasswordSubmit} />
        </div>
    );
};
