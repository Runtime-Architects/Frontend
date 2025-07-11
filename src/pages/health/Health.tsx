import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Spinner, MessageBar, MessageBarType, PrimaryButton, Stack, Text } from "@fluentui/react";
import styles from "./Health.module.css";
import { checkHealth, HealthCheckResponse } from "../../api";

const Health = () => {
    const { t } = useTranslation();
    const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealthStatus = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await checkHealth();
            setHealthStatus(response);
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

    const renderComponentStatus = (label: string, value: string | boolean | number, isNeutralDisplay = false) => {
        const getStatusDisplay = () => {
            if (typeof value === 'boolean') {
                return {
                    text: value ? 'Yes' : 'No',
                    color: value ? '#107C10' : '#D13438'
                };
            }
            if (typeof value === 'string') {
                // If it's a neutral display (like version, uptime), show in black
                if (isNeutralDisplay) {
                    return {
                        text: value,
                        color: '#323130'
                    };
                }
                
                const isHealthy = ['connected', 'initialized', 'operational', 'healthy'].includes(value.toLowerCase());
                const isWarning = ['quota_exceeded', 'invalid_key', 'forbidden', 'unknown'].includes(value.toLowerCase());
                // Capitalize first letter of status values and replace underscores with spaces
                const capitalizedValue = value.replace(/_/g, ' ').charAt(0).toUpperCase() + value.replace(/_/g, ' ').slice(1);
                return {
                    text: capitalizedValue,
                    color: isHealthy ? '#107C10' : isWarning ? '#FF8C00' : '#D13438'
                };
            }
            return {
                text: value.toString(),
                color: '#605E5C'
            };
        };

        const statusDisplay = getStatusDisplay();
        
        return (
            <div className={styles.componentItem} key={label}>
                <Text variant="medium" className={styles.componentLabel}>
                    {label}:
                </Text>
                <Text 
                    variant="medium" 
                    className={styles.componentValue}
                    style={{ color: statusDisplay.color, fontWeight: '600' }}
                >
                    {statusDisplay.text}
                </Text>
            </div>
        );
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
                    <>
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

                        {/* System Information */}
                        {(healthStatus.version || healthStatus.uptime_check) && (
                            <div className={styles.systemInfo}>
                                <Text variant="large" className={styles.sectionTitle}>
                                    {t("health.systemInfo", "System Information")}
                                </Text>
                                <Stack tokens={{ childrenGap: 8 }}>
                                    {healthStatus.version && renderComponentStatus(
                                        t("health.version", "Version"), 
                                        healthStatus.version,
                                        true
                                    )}
                                    {healthStatus.uptime_check && renderComponentStatus(
                                        t("health.uptime", "Uptime Since"), 
                                        new Date(healthStatus.uptime_check).toLocaleString(),
                                        true
                                    )}
                                </Stack>
                            </div>
                        )}

                        {/* Component Status */}
                        {healthStatus.components && (
                            <div className={styles.componentsSection}>
                                <Text variant="large" className={styles.sectionTitle}>
                                    {t("health.components", "Component Status")}
                                </Text>
                                <Stack tokens={{ childrenGap: 12 }}>
                                    {renderComponentStatus(
                                        t("health.agentsStatus", "Agents Status"), 
                                        healthStatus.components.agents_status
                                    )}
                                    {renderComponentStatus(
                                        t("health.openaiStatus", "OpenAI Client"), 
                                        healthStatus.components.openai_client_status
                                    )}
                                    {healthStatus.components.openai_api_status && renderComponentStatus(
                                        t("health.openaiApiStatus", "OpenAI API Status"), 
                                        healthStatus.components.openai_api_status
                                    )}
                                    {renderComponentStatus(
                                        t("health.apiKeyConfigured", "API Key Configured"), 
                                        healthStatus.components.api_key_configured
                                    )}
                                    {renderComponentStatus(
                                        t("health.dataDirectory", "Data Directory Exists"), 
                                        healthStatus.components.data_directory_exists
                                    )}
                                    {renderComponentStatus(
                                        t("health.dataFilesCount", "Data Files Count"), 
                                        healthStatus.components.data_files_count
                                    )}
                                </Stack>
                            </div>
                        )}

                        {/* API Error Details */}
                        {healthStatus.api_error && (
                            <div className={styles.errorSection} style={{ marginTop: '2rem' }}>
                                <Text variant="large" className={styles.sectionTitle}>
                                    {t("health.apiError", "API Error Details")}
                                </Text>
                                <MessageBar 
                                    messageBarType={MessageBarType.error}
                                    isMultiline
                                >
                                    <div className={styles.errorDetails}>
                                        {healthStatus.api_error}
                                    </div>
                                </MessageBar>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default Health;
