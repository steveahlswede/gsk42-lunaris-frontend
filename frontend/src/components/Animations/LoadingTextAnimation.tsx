import { createNumberArray } from "../../utils/arrayUtils";
import styles from "./LoadingTextAnimations.module.css";

interface LoadingTextAnimationProps {
    numberLoadingBars: number;
    loadingBarHeight: string;
}

export const LoadingTextAnimation = (props: LoadingTextAnimationProps) => (
    <div className={styles.loadingAnimation}>
        {createNumberArray(props.numberLoadingBars).map(item => (
            <div key={item} className={styles.loadingBar} style={{ height: props.loadingBarHeight }}></div>
        ))}
    </div>
);
