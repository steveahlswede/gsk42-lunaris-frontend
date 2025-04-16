import { Button } from "@fluentui/react-components";
import styles from "./PromptButton.module.css";
import { StringUtils } from "@azure/msal-browser";

interface PromptButtonProps {
    toggleMenu: () => void;
    buttonRef?: React.RefObject<HTMLButtonElement>;
    loggedIn: boolean;
    iconSource: string;
    iconAlt: string;
    text: string;
    className?: string;
}

export const PromptButton = ({ toggleMenu, buttonRef, loggedIn, iconSource, iconAlt, text, className }: PromptButtonProps) => {
    return (
        <Button
            ref={buttonRef}
            disabled={!loggedIn}
            icon={<img src={iconSource} alt={iconAlt} className={styles.iconImage} />}
            onClick={toggleMenu}
            className={`${styles.promptButton} ${className ?? ""}`}
        >
            {text}
        </Button>
    );
};

export function sendPromptDerWoche(promptText: string) {
    const recipient = "CCD@gsk.de";
    const subject = "Prompt der Woche";
    const body = `Liebes CCD Team,\n\nich habe eine neue Prompt-Idee, die für andere nützlich sein könnte, und würde sie daher gerne für die Promptdatenbank einreichen:\n\n"\n${promptText}\n"\n\nBeste Grüße\n`;

    // Construct the mailto link
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open Outlook (or the default email client)
    window.location.href = mailtoLink;
}
