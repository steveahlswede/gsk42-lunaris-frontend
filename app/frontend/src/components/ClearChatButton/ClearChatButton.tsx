import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

import styles from "./ClearChatButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const ClearChatButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={`${styles.container} ${className ?? ""}`}>
            <Button
                icon={<img src="./restart.svg" alt="Clear Chat Icon" className={styles.clearChatIcon} />}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "16px" // Space between the icon and text
                }}
                disabled={disabled}
                onClick={onClick}
            >
                {t("clearChat")}
            </Button>
        </div>
    );
};
