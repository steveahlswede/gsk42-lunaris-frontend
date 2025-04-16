import styles from "./ToggleButton.module.css";

interface ToggleProps {
    toggleOptionSelected: (option: string) => void;
    optionSelected: string;
    toggleButtonChoices: { [key: string]: string };
    className?: string;
}

export const ToggleButtons = ({ optionSelected, toggleOptionSelected, toggleButtonChoices, className }: ToggleProps) => {
    return (
        <div className={`${styles.toggleSwitchContainer} ${className ?? ""}`}>
            <div className={styles.toggleSwitch}>
                {Object.values(toggleButtonChoices).map(option => (
                    <button
                        key={option}
                        className={`${styles.toggleButton} ${optionSelected === option ? styles.active : ""}`}
                        onClick={() => toggleOptionSelected(option)}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};
