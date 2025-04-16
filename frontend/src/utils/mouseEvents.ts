import { MutableRefObject } from "react";

export const handleClickOutsideDivElement = (
    isElementOpen: boolean,
    elementRef: MutableRefObject<HTMLDivElement | undefined>,
    buttonWhichOpensElementRef: MutableRefObject<HTMLButtonElement | null>,
    setIsElementOpen: (value: boolean) => void
) => {
    const handleClickOutside = (event: MouseEvent) => {
        if (
            isElementOpen &&
            elementRef.current &&
            !elementRef.current.contains(event.target as Node) &&
            buttonWhichOpensElementRef.current &&
            !buttonWhichOpensElementRef.current.contains(event.target as Node)
        ) {
            setIsElementOpen(false);
        }
    };

    return handleClickOutside;
};
