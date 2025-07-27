import { useMemo, useState } from "react";
import { Stack, IconButton } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import styles from "./Answer.module.css";
import { ChatAppResponse } from "../../api";
import { parseAnswerToHtml } from "./AnswerParser";
import { AnswerIcon } from "./AnswerIcon";

interface Props {
    answer: ChatAppResponse;
    index: number;
    isSelected?: boolean;
    isStreaming: boolean;
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
}

// ...existing imports...

export const Answer = ({
    answer,
    index,
    isSelected,
    isStreaming,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions
}: Props) => {
    const parsedAnswer = useMemo(() => parseAnswerToHtml(answer, isStreaming, onCitationClicked), [answer, isStreaming, onCitationClicked]);
    const { t } = useTranslation();
    const sanitizedAnswerHtml = DOMPurify.sanitize(parsedAnswer.answerHtml);
    const [copied, setCopied] = useState(false);

    // Add local state for showing context
    const [showContext, setShowContext] = useState(false);

    const handleCopy = () => {
        const textToCopy = sanitizedAnswerHtml.replace(/<[^>]+>/g, "");
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error("Failed to copy text: ", err));
    };

    // Handler for supporting content button
    const handleSupportingContentClick = () => {
        console.log("Supporting content button clicked:", {
            contextExists: !!answer.context,
            contextType: typeof answer.context,
            isArray: Array.isArray(answer.context),
            contextLength: answer.context?.length,
            contextPreview: Array.isArray(answer.context) ? answer.context.slice(0, 2) : answer.context
        });
        setShowContext(prev => !prev);
        onSupportingContentClicked();
    };

    return (
        <Stack className={`${styles.answerContainer} ${isSelected && styles.selected}`} verticalAlign="space-between">
            <Stack.Item>
                <Stack horizontal horizontalAlign="space-between">
                    <AnswerIcon />
                    <div>
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: copied ? "CheckMark" : "Copy" }}
                            title={copied ? t("tooltips.copied") : t("tooltips.copy")}
                            ariaLabel={copied ? t("tooltips.copied") : t("tooltips.copy")}
                            onClick={handleCopy}
                        />
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "ClipboardList" }}
                            title={t("tooltips.showSupportingContent")}
                            ariaLabel={t("tooltips.showSupportingContent")}
                            onClick={handleSupportingContentClick}
                            disabled={!answer.context || !Array.isArray(answer.context) || answer.context.length === 0}
                        />
                    </div>
                </Stack>
            </Stack.Item>

            <Stack.Item grow>
                <div className={styles.answerText}>
                    <ReactMarkdown children={sanitizedAnswerHtml} rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]} />
                </div>
            </Stack.Item>

            {/* Show context only if showContext is true */}
            {showContext && answer.context && Array.isArray(answer.context) && answer.context.length > 0 && (
                <Stack.Item>
                    <div className={styles.contextMessages}>
                        <strong>{t("headerTexts.supportingContent")}:</strong>
                        <ul>
                            {answer.context.map((msg, i) => (
                                <li key={i}>
                                    {msg.role ? <><b>{msg.role}:</b> {msg.content}</> : msg.content}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Stack.Item>
            )}
        </Stack>
    );
};