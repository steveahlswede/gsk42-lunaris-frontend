import styles from "./ClickableTextItem.module.css";

interface Props {
    children: React.ReactNode;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick: () => void;
    key: string;
    fontSize?: string;
    fontWeight?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    hoverBackgroundColor?: string;
    className?: string;
}

export const ClickableTextItem = (props: Props) => {
    return (
        <div
            className={`${styles.clickableItem} ${props.className ? props.className : ""}`}
            key={props.key}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
        >
            {props.children}
        </div>
    );
};
