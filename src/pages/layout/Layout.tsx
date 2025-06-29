import React, { useState, useEffect, useRef, RefObject } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { Icon, TooltipHost } from "@fluentui/react";

const Layout = () => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef: RefObject<HTMLDivElement> = useRef(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
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
        <div className={styles.layout}>
            <header className={styles.header} role={"banner"}>
                <div className={styles.headerContainer} ref={menuRef}>
                    <Link to="/" className={styles.headerTitleContainer}>
                        <h3 className={styles.headerTitle}>{t("headerTitle")}</h3>
                    </Link>
                    <div className={styles.headerActions}>
                        <TooltipHost content={t("health.buttonTooltip", "Check backend health status")}>
                            <Link 
                                to="/health" 
                                className={styles.healthButton}
                            >
                                <div className={styles.healthButtonContent}>
                                    <Icon iconName="Health" />
                                    <span className={styles.healthButtonText}>{t("health.buttonText", "Health")}</span>
                                </div>
                            </Link>
                        </TooltipHost>
                    </div>
                </div>
            </header>

            <Outlet />
        </div>
    );
};

export default Layout;
