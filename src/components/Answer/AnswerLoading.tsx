import { Stack } from "@fluentui/react";
import { animated, useSpring } from "@react-spring/web";
import { useTranslation } from "react-i18next";

import styles from "./Answer.module.css";
import { AnswerIcon } from "./AnswerIcon";
import { StreamingEvent } from "../../api";

interface Props {
    streamMessages: StreamingEvent[];
    currentProgress?: number;
}

export const AnswerLoading = ({ streamMessages, currentProgress = 0 }: Props) => {
    const { t } = useTranslation();
    const animatedStyles = useSpring({
        from: { opacity: 0 },
        to: { opacity: 1 }
    });

    return (
        <animated.div style={{ ...animatedStyles }}>
            <Stack className={styles.answerContainer} verticalAlign="space-between">
                <AnswerIcon />
                <Stack.Item grow>
                    <p className={styles.answerText}>
                        {t("generatingAnswer")}
                        <span className={styles.loadingdots} />
                    </p>
                    
                    {/* Progress bar */}
                    {currentProgress > 0 && (
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                                <div 
                                    className={styles.progressFill} 
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                            <span className={styles.progressText}>{currentProgress}%</span>
                        </div>
                    )}
                    
                    {/* Streaming messages */}
                    {streamMessages && streamMessages.length > 0 && (
                        <div className={styles.streamingMessages}>
                            {streamMessages.slice(-5).map((event, idx) => (
                                <div 
                                    key={idx} 
                                    className={`${styles.streamingMessage} ${
                                        event.event.event_type === "error" ? styles.errorMessage : ""
                                    }`}
                                >
                                    <span className={styles.agentName}>
                                        {event.event.agent_name || "System"}:
                                    </span>
                                    <span className={styles.agentMessage}>
                                        {event.event.message}
                                    </span>
                                    <span className={styles.eventType}>
                                        [{event.event.event_type}]
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Stack.Item>
            </Stack>
        </animated.div>
    );
};
