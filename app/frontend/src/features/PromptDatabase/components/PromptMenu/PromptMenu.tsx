import { LoadingTextAnimation } from "../../../../components/Animations/LoadingTextAnimation";
import styles from "./PromptMenu.module.css";
import { PromptMenuChoices, PromptsDbResponse } from "../../models";
import { ClickableTextItem } from "../../../../components/ClickableTextItem";
import { DropDownMenu, MenuPosition } from "../../../../components/Menus";
import { ToggleButtons } from "../../../../components/Buttons";
import { Button } from "@fluentui/react-components";

interface PromptMenuPagesProps {
    handlePromptClick: (prompt: string) => void;
    userPrompts: PromptsDbResponse[];
    globalPrompts: PromptsDbResponse[];
    handlePromptHovered: (prompt: string) => void;
    handlePromptUnhovered: () => void;
    pageSelected: string;
    deleteUserPrompt: (promptId: string) => Promise<void>;
}

export const PromptMenuPages = (props: PromptMenuPagesProps) => {
    const allPrompts = props.userPrompts.concat(props.globalPrompts);

    return (
        <div className={styles.itemsContainer}>
            {allPrompts.length === 0 ? (
                <LoadingTextAnimation numberLoadingBars={4} loadingBarHeight="22px" />
            ) : props.pageSelected === PromptMenuChoices.USER && props.userPrompts.length === 0 ? (
                <div className={styles.promptItemsMissing}>No user prompts found</div>
            ) : (
                allPrompts
                    .filter(prompt => prompt.source.toLowerCase() === props.pageSelected.toLowerCase())
                    .map(prompt =>
                        props.pageSelected === PromptMenuChoices.USER ? (
                            <div className={styles.userPromptContainer}>
                                <ClickableTextItem
                                    key={prompt.title}
                                    onClick={() => props.handlePromptClick(prompt.prompt)}
                                    onMouseEnter={() => props.handlePromptHovered(prompt.prompt)}
                                    onMouseLeave={() => props.handlePromptUnhovered()}
                                    className={styles.clickablePrompt}
                                >
                                    {prompt.title}
                                </ClickableTextItem>
                                <Button
                                    icon={
                                        <img
                                            src="./trash-alt.svg"
                                            alt="Chat Bot Icon"
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                marginLeft: "1px"
                                            }}
                                        />
                                    }
                                    className={styles.deletePromptButton}
                                    onClick={() => props.deleteUserPrompt(prompt.id)}
                                />
                            </div>
                        ) : (
                            <ClickableTextItem
                                key={prompt.title}
                                onClick={() => props.handlePromptClick(prompt.prompt)}
                                onMouseEnter={() => props.handlePromptHovered(prompt.prompt)}
                                onMouseLeave={() => props.handlePromptUnhovered()}
                                className={styles.clickablePrompt}
                                children={prompt.title}
                            />
                        )
                    )
            )}
        </div>
    );
};

interface PromptMenuProps {
    userPrompts: PromptsDbResponse[];
    globalPrompts: PromptsDbResponse[];
    menuRef: React.RefObject<HTMLDivElement | undefined>;
    toggleMenuSection: (option: string) => void;
    menuSectionSelected: string;
    handlePromptClick: (prompt: string) => void;
    handlePromptHovered: (prompt: string) => void;
    handlePromptUnhovered: () => void;
    deleteUserPrompt: (promptId: string) => Promise<void>;
    getMenuPosition: () => MenuPosition;
}

export const PromptMenu = ({
    userPrompts,
    globalPrompts,
    menuRef,
    toggleMenuSection,
    menuSectionSelected,
    handlePromptClick,
    handlePromptHovered,
    handlePromptUnhovered,
    deleteUserPrompt,
    getMenuPosition
}: PromptMenuProps) => {
    return (
        <DropDownMenu
            getMenuPosition={getMenuPosition}
            style={{ backgroundColor: "white", paddingTop: "0.4rem", borderRadius: "8px", display: "flex", flexDirection: "column" }}
            menuRef={menuRef}
            className={styles.promptMenu}
        >
            <ToggleButtons toggleOptionSelected={toggleMenuSection} optionSelected={menuSectionSelected} toggleButtonChoices={PromptMenuChoices} />
            <PromptMenuPages
                globalPrompts={globalPrompts}
                userPrompts={userPrompts}
                pageSelected={menuSectionSelected}
                handlePromptClick={handlePromptClick}
                handlePromptHovered={handlePromptHovered}
                handlePromptUnhovered={handlePromptUnhovered}
                deleteUserPrompt={deleteUserPrompt}
            />
        </DropDownMenu>
    );
};
