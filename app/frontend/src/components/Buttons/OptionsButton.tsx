import styles from "./OptionsButton.module.css";

const Dot = () => <div className={styles.dotStyle} />;

interface OptionsProps {
    toggleLoadPromptMenu: () => void;
    buttonRefDropdownMenu: any;
}

export const ThreeDotsOptionButton = (props: OptionsProps) => {
    return (
        <div className={styles.optionsButtonDiv}>
            <button
                onClick={() => {
                    props.toggleLoadPromptMenu();
                }}
                className={styles.optionsButton}
                ref={props.buttonRefDropdownMenu}
            >
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px"
                    }}
                >
                    <Dot />
                    <Dot />
                    <Dot />
                </span>
            </button>
        </div>
    );
};
