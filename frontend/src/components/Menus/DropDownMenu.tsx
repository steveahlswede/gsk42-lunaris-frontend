import { ReactNode } from "react";
import styles from "./DropDownMenu.module.css";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { handleClickOutsideDivElement } from "../../utils/mouseEvents";

export interface MenuPosition {
    // all values should be strings defining the position, e.g. 10px
    top?: string;
    left?: string;
    bottom?: string;
    right?: string;
}

interface DropDownMenuProps {
    children?: ReactNode;
    /* Used for referencing the menu, in case something like a click outside event is needed */
    menuRef: any;
    /* Used for positioning the menu relative to some position like the button that was clicked to open the menu */
    style?: React.CSSProperties;
    getMenuPosition: () => MenuPosition;
    className?: string;
}

export const DropDownMenu = (props: DropDownMenuProps) => {
    return (
        <div
            ref={props.menuRef}
            className={`${styles.dropdownMenu} ${props.className ? props.className : ""}`}
            style={{
                ...props.getMenuPosition(),
                ...props.style
            }}
        >
            {props.children}
        </div>
    );
};

export function menuPositionUnderneath(buttonRef: HTMLButtonElement | null) {
    if (buttonRef) {
        const rect = buttonRef.getBoundingClientRect();
        return {
            top: `${rect.top + rect.height + 2}px`,
            left: `${rect.left - 2}px`
        };
    } else {
        return { top: "0px", left: "0px" };
    }
}

export function menuPositionLeft(buttonRef: HTMLButtonElement | null) {
    if (buttonRef) {
        const rect = buttonRef.getBoundingClientRect();
        return {
            bottom: `${window.innerHeight - rect.bottom - 13}px`,
            right: `${window.innerWidth - rect.left + 15}px`
        };
    } else {
        return { bottom: "0px", right: "0px" };
    }
}

export const useOpenCloseMenu = (menuRef: MutableRefObject<HTMLDivElement | undefined>) => {
    const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
    const buttonRefDropdownMenu = useRef<HTMLButtonElement | null>(null);

    const toggleLoadPromptMenu = () => {
        setIsDropdownMenuOpen(!isDropdownMenuOpen);
    };

    useEffect(() => {
        // Closes the load prompt menu when clicks occur outside of it
        const handleClickOutside = handleClickOutsideDivElement(isDropdownMenuOpen, menuRef, buttonRefDropdownMenu, setIsDropdownMenuOpen);

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownMenuOpen]);

    return { toggleLoadPromptMenu, buttonRefDropdownMenu, isDropdownMenuOpen };
};
