import { useState, useEffect } from "react";
import { Stack, TextField } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { Send28Filled } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./QuestionInput.module.css";
import { SpeechInput } from "./SpeechInput";

interface Props {
    onSend: (question: string) => void;
    disabled: boolean;
    initQuestion?: string;
    placeholder?: string;
    clearOnSend?: boolean;
    showSpeechInput?: boolean;
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, initQuestion, showSpeechInput }: Props) => {
    const [question, setQuestion] = useState<string>("");
    const { t } = useTranslation();
    const [isComposing, setIsComposing] = useState(false);
    const [textAreaHeight, setTextAreaHeight] = useState<number>(44);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initQuestion && setQuestion(initQuestion);
    }, [initQuestion]);

    // Calculate height based on content
    const calculateHeight = (text: string) => {
        // Create a temporary element to measure text height
        const tempDiv = document.createElement('div');
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.style.fontSize = '14px';
        tempDiv.style.lineHeight = '1.5';
        tempDiv.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        tempDiv.style.width = '100%';
        tempDiv.style.padding = '8px 12px';
        tempDiv.textContent = text || placeholder || '';
        
        document.body.appendChild(tempDiv);
        const scrollHeight = tempDiv.scrollHeight;
        document.body.removeChild(tempDiv);
        
        // Min height: 44px, Max height: 120px
        return Math.min(Math.max(scrollHeight, 44), 120);
    };

    useEffect(() => {
        const newHeight = calculateHeight(question);
        setTextAreaHeight(newHeight);
    }, [question, placeholder]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
            }
        };
    }, [tooltipTimeout]);

    const sendQuestion = () => {
        if (disabled || !question.trim()) {
            return;
        }

        onSend(question);

        if (clearOnSend) {
            setQuestion("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (isComposing) return;

        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const handleCompositionStart = () => {
        setIsComposing(true);
    };
    const handleCompositionEnd = () => {
        setIsComposing(false);
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (!newValue) {
            setQuestion("");
        } else if (newValue.length <= 1000) {
            setQuestion(newValue);
        }
    };

    const sendQuestionDisabled = disabled || !question.trim();

    const handleMouseEnter = () => {
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }
        const timeout = setTimeout(() => {
            setShowTooltip(true);
        }, 500); // 500ms delay
        setTooltipTimeout(timeout);
    };

    const handleMouseLeave = () => {
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            setTooltipTimeout(null);
        }
        setShowTooltip(false);
    };

    return (
        <Stack horizontal className={`${styles.questionInputContainer} ${disabled ? styles.disabled : ''}`}>
            <TextField
                className={styles.questionInputTextArea}
                disabled={false} // Never disable the visual appearance
                placeholder={disabled ? t("generatingAnswer") + "..." : placeholder}
                multiline
                resizable={false}
                borderless
                value={question}
                onChange={disabled ? undefined : onQuestionChange} // Disable functionality, not appearance
                onKeyDown={disabled ? undefined : onEnterPress}
                onCompositionStart={disabled ? undefined : handleCompositionStart}
                onCompositionEnd={disabled ? undefined : handleCompositionEnd}
                readOnly={disabled} // Use readOnly instead of disabled for better UX
                styles={{
                    field: {
                        height: `${textAreaHeight}px`,
                        minHeight: '44px',
                        maxHeight: '120px',
                        overflowY: textAreaHeight >= 120 ? 'auto' : 'hidden',
                        lineHeight: '1.5',
                        padding: '8px 12px',
                        fontSize: '14px',
                        transition: 'height 0.2s ease',
                        backgroundColor: 'transparent',
                        cursor: disabled ? 'not-allowed' : 'text'
                    },
                    fieldGroup: {
                        backgroundColor: 'transparent'
                    }
                }}
            />
            <div 
                className={styles.questionInputButtonsContainer}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className={styles.tooltipContainer}>
                    <Button 
                        size="large" 
                        icon={<Send28Filled primaryFill={disabled ? "#ccc" : "rgba(115, 118, 225, 1)"} />} 
                        disabled={sendQuestionDisabled} 
                        onClick={sendQuestion}
                        style={{ 
                            alignSelf: 'center',
                            opacity: disabled ? 0.5 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                    />
                    {showTooltip && (
                        <div className={`${styles.customTooltip} ${disabled ? styles.tooltipDisabled : styles.tooltipEnabled}`}>
                            <div className={styles.tooltipContent}>
                                <span className={styles.tooltipText}>
                                    {disabled ? t("waitingForResponse") : t("tooltips.submitQuestion")}
                                </span>
                                {!disabled && (
                                    <span className={styles.tooltipShortcut}>
                                        Enter ↵
                                    </span>
                                )}
                            </div>
                            <div className={styles.tooltipArrow}></div>
                        </div>
                    )}
                </div>
            </div>
            {showSpeechInput && <SpeechInput updateQuestion={setQuestion} />}
        </Stack>
    );
};