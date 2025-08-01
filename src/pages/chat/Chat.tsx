import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import appLogo from "../../assets/applogo.svg";
import styles from "./Chat.module.css";

import { askApi, askApiStreamWithHandlers, askConversationStreamWithHandlers, ChatAppResponse, StreamingEvent } from "../../api";
import { Answer, AnswerError, AnswerLoading } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { UserChatMessage } from "../../components/UserChatMessage";
import { ClearChatButton } from "../../components/ClearChatButton";
import { LanguagePicker } from "../../i18n/LanguagePicker";
import { ExampleList } from "../../components/Example";
import { HistorySidebar } from "../../components/HistorySidebar";
import { HistoryProviderOptions, Answers } from "../../components/HistoryProviders/IProvider";
import { useHistoryManager } from "../../components/HistoryProviders";
import { getAccessToken } from "../../utils/auth";

const Chat = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<unknown>();
    const [answers, setAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const lastQuestionRef = useRef<string>("");
    const [streamMessages, setStreamMessages] = useState<StreamingEvent[]>([]);
    const [currentProgress, setCurrentProgress] = useState<number>(0);
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

    const { t, i18n } = useTranslation();
    const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(true);
    
    // Initialize history manager for saving conversations
    const historyManager = useHistoryManager(HistoryProviderOptions.CosmosDB);

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
        if (errorMessage.includes("empty response") || errorMessage.includes("didn't provide a response")) {
            return "The AI processed your request but didn't generate a response. Please try rephrasing your question or try again.";
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

        // Set up a timeout to detect if response never comes after completion
        let completedButNoResponse = false;
        let responseTimeout: NodeJS.Timeout | null = null;

        try {
            let finalResponse: string | null = null;
            let capturedContext: Array<{ content: string; role: string; name?: string }> = [];

            // Helper function to capture context from any event
            const captureContextFromEvent = (event: StreamingEvent, eventType: string) => {
                if (event.event?.data?.context) {
                    const contextData = event.event.data.context;
                    
                    // Handle different context formats
                    if (Array.isArray(contextData)) {
                        // Context is already an array
                        capturedContext = contextData;
                    } else if (typeof contextData === 'string') {
                        // Context is a string, display it as-is without any role prefix
                        capturedContext = [{ role: '', content: contextData }];
                    }
                    
                    if (capturedContext.length > 0) {
                        console.log(`Context captured from ${eventType} event:`, {
                            eventType,
                            originalContext: event.event.data.context,
                            parsedContext: capturedContext,
                            contextLength: capturedContext.length,
                            isArray: Array.isArray(capturedContext)
                        });
                    }
                }
            };

            // Check if we have an existing conversation or need to start a new one
            if (currentConversationId === null) {
                // Start a new conversation
                const result = await askApiStreamWithHandlers(question, {
                    onStarted: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "started");
                    },
                    onAgentThinking: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "agent_thinking");
                    },
                    onAgentResponse: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "agent_response");
                    },
                    onCompleted: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        console.log("Completed event received:", event);
                        
                        // Capture context from the completed event
                        captureContextFromEvent(event, "completed");
                        
                        // Check if we have content in the completed event
                        if (event.event?.data?.full_content) {
                            console.log("Full content found in completed event:", event.event.data.full_content.length, "characters");
                        }
                        
                        // Check if the completed event indicates success but we might get empty response
                        if (event.event?.message === "Task completed successfully") {
                            console.log("Task completed successfully, waiting for final response...");
                            completedButNoResponse = true;
                            
                            // Set a timeout to check if we get a response within reasonable time
                            responseTimeout = setTimeout(() => {
                                if (completedButNoResponse) {
                                    console.warn("No response received within timeout after completion");
                                    setError(new Error("The AI completed the task but took too long to provide a response. Please try again."));
                                    setIsLoading(false);
                                }
                            }, 10000); // 10 second timeout
                        }
                    },
                    onError: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        // Set error state with simplified message when streaming error occurs
                        setError(new Error(getSimpleErrorMessage(event.event.message)));
                    },
                    onProgress: (progress, agent, message) => {
                        setCurrentProgress(progress);
                    },
                    onConversationCreated: (conversationId) => {
                        console.log("New conversation created with ID:", conversationId);
                        setCurrentConversationId(conversationId);
                    }
                });

                finalResponse = result.response;
            } else {
                // Continue existing conversation
                finalResponse = await askConversationStreamWithHandlers(currentConversationId, question, {
                    onStarted: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "started");
                    },
                    onAgentThinking: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "agent_thinking");
                    },
                    onAgentResponse: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        captureContextFromEvent(event, "agent_response");
                    },
                    onCompleted: (event) => {
                        setStreamMessages(prev => [...prev, event]);
                        console.log("Completed event received:", event);
                        
                        // Capture context from the completed event
                        captureContextFromEvent(event, "completed");
                        
                        // Check if we have content in the completed event
                        if (event.event?.data?.full_content) {
                            console.log("Full content found in completed event:", event.event.data.full_content.length, "characters");
                        }
                        
                        // Check if the completed event indicates success but we might get empty response
                        if (event.event?.message === "Task completed successfully") {
                            console.log("Task completed successfully, waiting for final response...");
                            completedButNoResponse = true;
                            
                            // Set a timeout to check if we get a response within reasonable time
                            responseTimeout = setTimeout(() => {
                                if (completedButNoResponse) {
                                    console.warn("No response received within timeout after completion");
                                    setError(new Error("The AI completed the task but took too long to provide a response. Please try again."));
                                    setIsLoading(false);
                                }
                            }, 10000); // 10 second timeout
                        }
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
            }

            // Clear timeout if we got here
            if (responseTimeout) {
                clearTimeout(responseTimeout);
            }
            completedButNoResponse = false;

            // Create a ChatAppResponse from the final response
            if (finalResponse) {
                // Check if the response is empty or just whitespace
                const trimmedResponse = finalResponse.trim();
                console.log("Final response received:", { 
                    originalLength: finalResponse.length, 
                    trimmedLength: trimmedResponse.length,
                    isEmpty: !trimmedResponse,
                    preview: trimmedResponse.substring(0, 100) + "..."
                });
                
                if (!trimmedResponse) {
                    console.warn("Empty response detected after successful completion");
                    setError(new Error("The AI completed the task but returned an empty response. Please try asking your question again."));
                    return;
                }
                
                const chatResponse: ChatAppResponse = {
                    message: { content: finalResponse, role: "assistant" },
                    context: Array.isArray(capturedContext) ? capturedContext : [], // Ensure context is always an array
                };

                console.log("ChatAppResponse created with context:", {
                    hasContext: capturedContext.length > 0,
                    contextLength: capturedContext.length,
                    contextData: capturedContext
                });

                setAnswers(prevAnswers => {
                    const newAnswers: [user: string, response: ChatAppResponse][] = [...prevAnswers, [question, chatResponse]];
                    
                    // Ensure all answers have valid context arrays (safety check)
                    const validatedAnswers = newAnswers.map(([q, response]) => [
                        q,
                        {
                            ...response,
                            context: Array.isArray(response.context) ? response.context : []
                        }
                    ] as [string, ChatAppResponse]);
                    
                    // Trigger history refresh when we get the first response in a new conversation
                    // or when continuing an existing conversation (to update the timestamp)
                    setHistoryRefreshTrigger(prev => prev + 1);
                    
                    return validatedAnswers;
                });
            } else {
                // Handle case where finalResponse is null/undefined
                console.warn("Final response is null/undefined after successful completion");
                setError(new Error("The AI completed processing but didn't provide a response. Please try asking your question again."));
            }
        } catch (e) {
            // Convert technical error messages to user-friendly ones
            const errorMessage = e instanceof Error ? e.message : String(e);
            setError(new Error(getSimpleErrorMessage(errorMessage)));
        } finally {
            // Clear any pending timeouts
            if (responseTimeout) {
                clearTimeout(responseTimeout);
            }
            setIsLoading(false);
            setStreamMessages([]);
            setCurrentProgress(0);
        }
    };

    const startNewConversation = () => {
        lastQuestionRef.current = "";
        setError(undefined);
        setAnswers([]);
        setCurrentConversationId(null); // Reset conversation ID to start a new conversation
        setIsLoading(false);
        // Trigger history refresh to ensure sidebar is up to date
        setHistoryRefreshTrigger(prev => prev + 1);
    };

    const onExampleClicked = (example: string) => {
        makeApiRequest(example);
    };

    const onChatSelected = (chatHistory: Answers, conversationId?: string) => {
        console.log("Chat selected with:", { chatHistory: chatHistory.length, conversationId });
        
        // Validate and fix context arrays in loaded chat history
        const validatedChatHistory: Answers = chatHistory.map(([question, response]) => [
            question,
            {
                ...response,
                context: Array.isArray(response.context) ? response.context : []
            }
        ]);
        
        setAnswers(validatedChatHistory);
        // If we have a conversation ID from the history, use it to continue the conversation
        if (conversationId) {
            const numericId = parseInt(conversationId);
            if (!isNaN(numericId)) {
                console.log("Loading conversation with ID:", numericId);
                setCurrentConversationId(numericId);
            } else {
                console.warn("Invalid conversation ID received:", conversationId);
                setCurrentConversationId(null);
            }
        } else {
            // Reset conversation ID when loading from history without ID
            // This will start a new conversation if the user continues chatting
            console.log("No conversation ID provided, resetting to null");
            setCurrentConversationId(null);
        }
        
        if (chatHistory.length > 0) {
            lastQuestionRef.current = chatHistory[chatHistory.length - 1][0];
        }
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("pageTitle")}</title>
            </Helmet>
            <div className={styles.chatRoot}>
                <HistorySidebar 
                    provider={HistoryProviderOptions.CosmosDB}
                    refreshTrigger={historyRefreshTrigger}
                    onChatSelected={onChatSelected}
                />
                <div className={styles.chatMainContent}>
                    <div className={styles.commandsSplitContainer}>
                        <div className={styles.commandsContainer}></div>
                        <div className={styles.commandsContainer}>
                            {currentConversationId && (
                                <ClearChatButton 
                                    className={styles.commandButton} 
                                    onClick={startNewConversation} 
                                    disabled={isLoading}
                                    translationKey="newConversation"
                                    iconType="add"
                                />
                            )}
                        </div>
                    </div>
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
        </div>
    );
};

export default Chat;