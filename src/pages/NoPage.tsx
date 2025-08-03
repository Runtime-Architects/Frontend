import React from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { 
    Stack, 
    Text, 
    PrimaryButton, 
    DefaultButton, 
    MessageBar, 
    MessageBarType,
    Icon
} from "@fluentui/react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./NoPage.module.css";

export function Component(): JSX.Element {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const goHome = () => {
        navigate('/');
    };

    const goBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const goToLogin = () => {
        navigate('/login');
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("error.pageNotFound", "Page Not Found")} - 404</title>
            </Helmet>
            
            <div className={styles.errorCard}>
                <Stack
                    horizontalAlign="center"
                    verticalAlign="center"
                    tokens={{ childrenGap: 30 }}
                    className={styles.content}
                >
                    {/* Large 404 Icon */}
                    <div className={styles.iconContainer}>
                        <Icon iconName="PageRemove" className={styles.errorIcon} />
                    </div>

                    {/* Error Message */}
                    <Stack tokens={{ childrenGap: 10 }} horizontalAlign="center">
                        <Text variant="xLarge" className={styles.errorTitle}>
                            404
                        </Text>
                        <Text variant="large" className={styles.errorSubtitle}>
                            {t("error.pageNotFoundTitle", "Page Not Found")}
                        </Text>
                        <Text variant="medium" className={styles.errorDescription}>
                            {t("error.pageNotFoundMessage", "The page you're looking for doesn't exist or has been moved.")}
                        </Text>
                    </Stack>

                    {/* Current Path Info */}
                    {location.pathname && (
                        <MessageBar messageBarType={MessageBarType.info} className={styles.pathInfo}>
                            <Text variant="small">
                                {t("error.requestedPath", "Requested path")}: <code>{location.pathname}</code>
                            </Text>
                        </MessageBar>
                    )}

                    {/* Action Buttons */}
                    <Stack horizontal tokens={{ childrenGap: 15 }}>
                        <PrimaryButton
                            text={t("error.goHome", "Go Home")}
                            onClick={goHome}
                            iconProps={{ iconName: "Home" }}
                        />
                        <DefaultButton
                            text={t("error.goBack", "Go Back")}
                            onClick={goBack}
                            iconProps={{ iconName: "Back" }}
                        />
                        {!isAuthenticated && (
                            <DefaultButton
                                text={t("auth.login", "Login")}
                                onClick={goToLogin}
                                iconProps={{ iconName: "Signin" }}
                            />
                        )}
                    </Stack>

                    {/* Helpful Suggestions */}
                    <Stack tokens={{ childrenGap: 10 }} className={styles.suggestions}>
                        <Text variant="medium" className={styles.suggestionsTitle}>
                            {t("error.suggestions", "Suggestions")}:
                        </Text>
                        <Stack tokens={{ childrenGap: 5 }}>
                            <Text variant="small">
                                • {t("error.suggestion1", "Check the URL for typos")}
                            </Text>
                            <Text variant="small">
                                • {t("error.suggestion2", "Use the navigation menu to find what you're looking for")}
                            </Text>
                            <Text variant="small">
                                • {t("error.suggestion3", "Return to the home page and start over")}
                            </Text>
                            {!isAuthenticated && (
                                <Text variant="small">
                                    • {t("error.suggestion4", "Login to access protected pages")}
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                </Stack>
            </div>
        </div>
    );
}

Component.displayName = "NoPage";
