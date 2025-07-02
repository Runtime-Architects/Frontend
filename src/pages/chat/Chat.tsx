import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import appLogo from "../../assets/applogo.svg";
import styles from "./Chat.module.css";

import { askApi, askApiStreamWithHandlers, ChatAppResponse, StreamingEvent } from "../../api";
import { Answer, AnswerError, AnswerLoading } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { UserChatMessage } from "../../components/UserChatMessage";
import { ClearChatButton } from "../../components/ClearChatButton";
import { LanguagePicker } from "../../i18n/LanguagePicker";
import { ExampleList } from "../../components/Example";

const Chat = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<unknown>();
    const [answers, setAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const lastQuestionRef = useRef<string>("");
    const [streamMessages, setStreamMessages] = useState<StreamingEvent[]>([]);
    const [currentProgress, setCurrentProgress] = useState<number>(0);

    const { t, i18n } = useTranslation();
    const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(true);

    // Function to generate user-friendly error messages
    const getSimpleErrorMessage = (errorMessage: string): string => {
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("insufficient_quota")) {
            return "Error 429. Please try again in a few minutes or contact support.";
        }
        if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
            return "Authentication error. Please check your API key.";
        }
        if (errorMessage.includes("500") || errorMessage.includes("internal server error")) {
            return "Server error. Please try again later.";
        }
        if (errorMessage.includes("timeout")) {
            return "Request timeout. Please try again.";
        }
        // For other errors, show a generic message
        return "An error occurred. Please try again or contact support.";
    };

    const makeApiRequest = async (question: string) => {
        lastQuestionRef.current = question;
        setError(undefined);
        setIsLoading(true);
        setStreamMessages([]);
        setCurrentProgress(0);

        try {
            const finalResponse = await askApiStreamWithHandlers(question, {
                onStarted: (event) => {
                    setStreamMessages(prev => [...prev, event]);
                },
                onAgentThinking: (event) => {
                    setStreamMessages(prev => [...prev, event]);
                },
                onAgentResponse: (event) => {
                    setStreamMessages(prev => [...prev, event]);
                },
                onCompleted: (event) => {
                    setStreamMessages(prev => [...prev, event]);
                },
                onError: (event) => {
                    setStreamMessages(prev => [...prev, event]);
                    // Set error state with simplified message when streaming error occurs
                    setError(new Error(getSimpleErrorMessage(event.event.message)));
                },
                onProgress: (progress, agent, message) => {
                    setCurrentProgress(progress);
                }
            });

            // Create a ChatAppResponse from the final response
            if (finalResponse) {
                const chatResponse: ChatAppResponse = {
                    message: { content: finalResponse, role: "assistant" },
                    context: [], // The streaming endpoint doesn't provide context in the same way
                };

                setAnswers(prevAnswers => [
                    ...prevAnswers,
                    [question, chatResponse]
                ]);
            }
        } catch (e) {
            // Convert technical error messages to user-friendly ones
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(new Error(getSimpleErrorMessage(errorMessage)));
        } finally {
            setIsLoading(false);
            setStreamMessages([]);
            setCurrentProgress(0);
        }
    };

    const clearChat = () => {
        lastQuestionRef.current = "";
        setError(undefined);
        setAnswers([]);
        setIsLoading(false);
    };

    const onExampleClicked = (example: string) => {
        makeApiRequest(example);
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("pageTitle")}</title>
            </Helmet>
            <div className={styles.commandsSplitContainer}>
                <div className={styles.commandsContainer}></div>
                <div className={styles.commandsContainer}>
                    <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
                </div>
            </div>
            <div className={styles.chatRoot}>
                <div className={styles.chatContainer}>
                    {!lastQuestionRef.current ? (
                        <div className={styles.chatEmptyState}>
                            <img src={appLogo} alt="App logo" width="120" height="120" />
                            <h1 className={styles.chatEmptyStateTitle}>{t("chatEmptyStateTitle")}</h1>
                            <h2 className={styles.chatEmptyStateSubtitle}>{t("chatEmptyStateSubtitle")}</h2>
                            {showLanguagePicker && (
                                <LanguagePicker onLanguageChange={newLang => i18n.changeLanguage(newLang)} />
                            )}
                            <ExampleList onExampleClicked={onExampleClicked} useGPT4V={false} />
                        </div>
                    ) : (
                        <div className={styles.chatMessageStream}>
                            {answers.map(([question, response], index) => (
                                <div key={index}>
                                    <UserChatMessage message={question} />
                                    <div className={styles.chatMessageGpt}>
                                        <Answer
                                            isStreaming={false}
                                            key={index}
                                            answer={response}
                                            index={index}
                                            isSelected={false}
                                            onCitationClicked={() => {}}
                                            onThoughtProcessClicked={() => {}}
                                            onSupportingContentClicked={() => {}}
                                        />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerLoading 
                                            streamMessages={streamMessages} 
                                            currentProgress={currentProgress}
                                        />
                                    </div>
                                </>
                            )}
                            {error ? (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerError error={getSimpleErrorMessage(error.toString())} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}
                    <div className={styles.chatInput}>
                        <QuestionInput
                            clearOnSend
                            placeholder={t("defaultExamples.placeholder")}
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;