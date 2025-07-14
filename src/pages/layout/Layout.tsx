import React, { useState, useEffect, useRef, RefObject } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { Icon, TooltipHost, DefaultButton, Callout, DirectionalHint } from "@fluentui/react";
import { useAuth } from "../../contexts/AuthContext";
import { UserProfile } from "../../components/UserProfile";

const Layout = () => {
    const { t } = useTranslation();
    const { isAuthenticated, user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef: RefObject<HTMLDivElement> = useRef(null);
    const userButtonRef: RefObject<HTMLDivElement> = useRef(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const toggleUserMenu = () => {
        setUserMenuOpen(!userMenuOpen);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpen(false);
        }
        if (userButtonRef.current && !userButtonRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
    };

    useEffect(() => {
        if (menuOpen || userMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen, userMenuOpen]);

    return (
        <div className={styles.layout}>
            <header className={styles.header} role={"banner"}>
                <div className={styles.headerContainer} ref={menuRef}>
                    <Link to="/" className={styles.headerTitleContainer}>
                        <h3 className={styles.headerTitle}>{t("headerTitle")}</h3>
                    </Link>
                    <div className={styles.headerActions}>
                        { isAuthenticated && user ? (
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
                        ) : null }
                        {isAuthenticated && user ? (
                            // Show user menu when authenticated
                            <div ref={userButtonRef}>
                                <TooltipHost content={t("auth.userMenu", "User menu")}>
                                    <DefaultButton
                                        onClick={toggleUserMenu}
                                        className={styles.userButton}
                                        iconProps={{ iconName: "Contact" }}
                                        text={user.email.split('@')[0]}
                                    />
                                </TooltipHost>
                                
                                {userMenuOpen && (
                                    <Callout
                                        target={userButtonRef}
                                        onDismiss={() => setUserMenuOpen(false)}
                                        directionalHint={DirectionalHint.bottomRightEdge}
                                        isBeakVisible={false}
                                        className={styles.userMenuCallout}
                                    >
                                        <UserProfile />
                                    </Callout>
                                )}
                            </div>
                        ) : (
                            // Show login/register buttons when not authenticated
                            <>
                                <TooltipHost content={t("auth.loginTooltip", "Login to your account")}>
                                    <Link 
                                        to="/login" 
                                        className={styles.authButton}
                                    >
                                        <div className={styles.authButtonContent}>
                                            <Icon iconName="Signin" />
                                            <span className={styles.authButtonText}>{t("auth.login", "Login")}</span>
                                        </div>
                                    </Link>
                                </TooltipHost>
                                
                                <TooltipHost content={t("auth.registerTooltip", "Create a new account")}>
                                    <Link 
                                        to="/register" 
                                        className={styles.authButton}
                                    >
                                        <div className={styles.authButtonContent}>
                                            <Icon iconName="AddFriend" />
                                            <span className={styles.authButtonText}>{t("auth.register", "Register")}</span>
                                        </div>
                                    </Link>
                                </TooltipHost>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <Outlet />
        </div>
    );
};

export default Layout;
