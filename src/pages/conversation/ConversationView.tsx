import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Spinner, DefaultButton, MessageBar, MessageBarType, SpinnerSize } from "@fluentui/react";

import styles from "./ConversationView.module.css";
import { useHistoryManager } from "../../components/HistoryProviders";
import { HistoryProviderOptions, Answers } from "../../components/HistoryProviders/IProvider";
import { getAccessToken } from "../../utils/auth";
import { Answer } from "../../components/Answer";
import { UserChatMessage } from "../../components/UserChatMessage";

const ConversationView: React.FC = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const [conversation, setConversation] = useState<Answers | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState<string>("");

    const historyManager = useHistoryManager(HistoryProviderOptions.CosmosDB);

    useEffect(() => {
        if (!conversationId) {
            setError("No conversation ID provided");
            setIsLoading(false);
            return;
        }

        loadConversation();
    }, [conversationId]);

    const loadConversation = async () => {
        if (!conversationId) return;

        try {
            setIsLoading(true);
            setError(null);
            
            console.log(`Loading conversation with ID: ${conversationId}`);
            const token = getAccessToken();
            const conversationData = await historyManager.getItem(conversationId, token || undefined);
            
            console.log("Loaded conversation data:", conversationData);
            
            if (conversationData) {
                setConversation(conversationData);
                // Set title from the first user message or use a default
                if (conversationData.length > 0) {
                    setConversationTitle(conversationData[0][0]);
                } else {
                    setConversationTitle(t("conversation.untitled", "Untitled Conversation"));
                }
            } else {
                console.warn("No conversation data returned");
                setError(t("conversation.notFound", "Conversation not found"));
            }
        } catch (err) {
            console.error("Failed to load conversation:", err);
            setError(t("conversation.loadError", "Failed to load conversation"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBack = () => {
        navigate("/");
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size={SpinnerSize.large} />
                    <p className={styles.loadingText}>{t("conversation.loading", "Loading conversation...")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Helmet>
                    <title>{t("conversation.error", "Error")} - {t("pageTitle")}</title>
                </Helmet>
                
                <div className={styles.header}>
                    <DefaultButton
                        iconProps={{ iconName: "Back" }}
                        onClick={handleGoBack}
                        className={styles.backButton}
                    >
                        {t("conversation.backToChat", "Back to Chat")}
                    </DefaultButton>
                </div>

                <div className={styles.errorContainer}>
                    <MessageBar messageBarType={MessageBarType.error}>
                        {error}
                    </MessageBar>
                    <DefaultButton onClick={loadConversation} className={styles.retryButton}>
                        {t("conversation.retry", "Retry")}
                    </DefaultButton>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{conversationTitle} - {t("pageTitle")}</title>
            </Helmet>
            
            <div className={styles.header}>
                <DefaultButton
                    iconProps={{ iconName: "Back" }}
                    onClick={handleGoBack}
                    className={styles.backButton}
                >
                    {t("conversation.backToChat", "Back to Chat")}
                </DefaultButton>
                <h1 className={styles.title}>{conversationTitle}</h1>
            </div>

            <div className={styles.conversationContainer}>
                {conversation && conversation.length > 0 ? (
                    <div className={styles.messagesContainer}>
                        {conversation.map(([userMessage, assistantResponse], index) => {
                            const isIncomplete = assistantResponse.message.content.includes("[Incomplete conversation");
                            
                            return (
                                <div key={index} className={styles.messageGroup}>
                                    <UserChatMessage message={userMessage} />
                                    <div className={`${styles.assistantMessage} ${isIncomplete ? styles.incomplete : ''}`}>
                                        <Answer
                                            isStreaming={false}
                                            answer={{
                                                ...assistantResponse,
                                                message: {
                                                    ...assistantResponse.message,
                                                    content: isIncomplete 
                                                        ? t("conversation.incomplete", "This conversation was not completed. No response was generated.")
                                                        : assistantResponse.message.content
                                                }
                                            }}
                                            index={index}
                                            isSelected={false}
                                            onCitationClicked={() => {}}
                                            onThoughtProcessClicked={() => {}}
                                            onSupportingContentClicked={() => {}}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyContainer}>
                        <p className={styles.emptyText}>
                            {t("conversation.empty", "This conversation appears to be empty.")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationView;
