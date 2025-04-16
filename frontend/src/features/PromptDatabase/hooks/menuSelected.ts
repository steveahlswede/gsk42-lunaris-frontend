import { useState } from "react";
import { PromptMenuChoices } from "../models";

export const useMenuSelected = () => {
    const [menuSectionSelected, setMenuSectionSelected] = useState<string>(PromptMenuChoices.GLOBAL);
    const toggleMenuSection = (section: string) => {
        setMenuSectionSelected(section);
    };

    return {
        menuSectionSelected,
        toggleMenuSection
    };
};
