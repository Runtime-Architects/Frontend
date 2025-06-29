import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Spinner, MessageBar, MessageBarType, PrimaryButton } from "@fluentui/react";
import styles from "./Health.module.css";
import { checkHealth } from "../../api";

interface HealthStatus {
    status: string;
    message: string;
    timestamp?: string;
}

const Health = () => {
    const { t } = useTranslation();
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealthStatus = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await checkHealth();
            setHealthStatus({
                ...response,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch health status");
            setHealthStatus(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthStatus();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
                return '#107C10'; // Green
            case 'warning':
                return '#FF8C00'; // Orange
            case 'error':
            case 'unhealthy':
                return '#D13438'; // Red
            default:
                return '#605E5C'; // Gray
        }
    };

    const getMessageBarType = (status: string): MessageBarType => {
        switch (status.toLowerCase()) {
            case 'healthy':
                return MessageBarType.success;
            case 'warning':
                return MessageBarType.warning;
            case 'error':
            case 'unhealthy':
                return MessageBarType.error;
            default:
                return MessageBarType.info;
        }
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("health.pageTitle", "Backend Health Status")}</title>
            </Helmet>
            
            <div className={styles.headerSection}>
                <h1 className={styles.title}>{t("health.title", "Backend Health Status")}</h1>
                <PrimaryButton 
                    text={t("health.refresh", "Refresh")} 
                    onClick={fetchHealthStatus}
                    disabled={isLoading}
                    iconProps={{ iconName: "Refresh" }}
                />
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <Spinner size={3} label={t("health.loading", "Checking backend status...")} />
                    </div>
                ) : error ? (
                    <MessageBar messageBarType={MessageBarType.error} isMultiline>
                        <strong>{t("health.error", "Error:")}</strong> {error}
                    </MessageBar>
                ) : healthStatus ? (
                    <div className={styles.statusContainer}>
                        <MessageBar 
                            messageBarType={getMessageBarType(healthStatus.status)}
                            isMultiline
                        >
                            <strong className={styles.statusText}>
                                {t("health.status", "Status")}: {healthStatus.status.toUpperCase()}
                            </strong>
                            <div className={styles.statusMessage}>
                                {healthStatus.message}
                            </div>
                            {healthStatus.timestamp && (
                                <div className={styles.timestamp}>
                                    {t("health.lastChecked", "Last checked")}: {new Date(healthStatus.timestamp).toLocaleString()}
                                </div>
                            )}
                        </MessageBar>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default Health;
