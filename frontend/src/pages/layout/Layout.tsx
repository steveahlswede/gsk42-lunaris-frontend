import React, { useState, useEffect, useRef, RefObject } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { useLogin } from "../../authConfig";
import i18n from "i18next";
import { LoginButton } from "../../components/LoginButton";
import { IconButton } from "@fluentui/react";
import { LocaleSwitcher } from "../../i18n/LocaleSwitcher";
import { ChatHistory } from "../../features/ChatHistory/components/ChatHistory";

const Layout = () => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isChatEmpty, setIsChatEmpty] = useState(true); // Zustand für Chat-Leerstatus

    const menuRef: RefObject<HTMLDivElement> = useRef(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleChatStateChange = (isChatEmpty: boolean) => {
        setIsChatEmpty(isChatEmpty);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <div className={styles.topLevelLayout}>
            <ChatHistory />
            <div className={styles.layout}>
                <header className={styles.header} role={"banner"}>
                    <div className={styles.headerContainer} ref={menuRef}>
                        {/* Logo nur anzeigen, wenn Chat nicht leer ist */}
                        <h4 className={styles.headerRightText}>powered by GPT4o Model Version 2024-08-06</h4>
                        <LocaleSwitcher onLanguageChange={newLang => i18n.changeLanguage(newLang)} />
                        <div className={styles.loginMenuContainer}>
                            <IconButton
                                iconProps={{ iconName: "GlobalNavButton" }}
                                className={styles.menuToggle}
                                onClick={toggleMenu}
                                ariaLabel="Toggle menu"
                            />
                            {useLogin && <LoginButton />}
                        </div>
                    </div>
                </header>

                {/* Outlet gibt den Chat-Inhalt weiter */}
                <Outlet context={{ onChatStart: handleChatStateChange }} />
            </div>
        </div>
    );
};

export default Layout;
