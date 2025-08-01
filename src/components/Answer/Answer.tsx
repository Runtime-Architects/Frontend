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

    // Add local state for showing context and images
    const [showContext, setShowContext] = useState(false);
    const [showImages, setShowImages] = useState(false);
    
    // State for CO2 plot navigation
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [imageError, setImageError] = useState<boolean>(false);
    const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);

    // Format date for image URL (YYYY-MM-DD format)
    const formatDateForImage = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Generate CO2 plot image URL for a specific date
    const getCO2PlotUrl = (date: Date): string => {
        const formattedDate = formatDateForImage(date);
        return `http://localhost:8000/images/co2plot_day_${formattedDate}_${formattedDate}.png`;
    };

    // Navigation handlers
    const navigateToPreviousDay = () => {
        const previousDay = new Date(currentDate);
        previousDay.setDate(previousDay.getDate() - 1);
        setCurrentDate(previousDay);
        setImageError(false);
    };

    const navigateToNextDay = () => {
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        // Don't allow navigation to future dates
        if (nextDay <= new Date()) {
            setCurrentDate(nextDay);
            setImageError(false);
        }
    };

    // Reset to today
    const navigateToToday = () => {
        setCurrentDate(new Date());
        setImageError(false);
    };

    // Extract image URLs from context if available (keeping original functionality as fallback)
    const contextImageUrls = useMemo(() => {
        if (!answer.context || !Array.isArray(answer.context)) return [];
        
        const urls: string[] = [];
        answer.context.forEach(item => {
            if (typeof item.content === 'string') {
                // Look for image URLs in the content (multiple patterns)
                const imagePatterns = [
                    /\/images\/[^\s"']+\.(?:png|jpg|jpeg|gif|svg)/gi,  // Standard image paths
                    /GET \/images\/[^\s"']+\.(?:png|jpg|jpeg|gif|svg)/gi,  // HTTP GET requests
                    /images\/[^\s"']+\.(?:png|jpg|jpeg|gif|svg)/gi  // Relative paths
                ];
                
                imagePatterns.forEach(pattern => {
                    const matches = item.content.match(pattern);
                    if (matches) {
                        matches.forEach(match => {
                            // Clean up the match to get just the path
                            let url = match.replace(/^GET\s+/, ''); // Remove GET prefix if present
                            
                            // Ensure it starts with /images/ for consistency
                            if (!url.startsWith('/images/') && url.includes('images/')) {
                                url = '/' + url.substring(url.indexOf('images/'));
                            }
                            
                            // Construct full URL with backend URI
                            const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
                            if (!urls.includes(fullUrl)) {
                                urls.push(fullUrl);
                            }
                        });
                    }
                });
            }
        });
        return urls;
    }, [answer.context]);

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

    // Handler for images button
    const handleImagesClick = () => {
        console.log("Images button clicked:", {
            contextImageUrls,
            contextImageCount: contextImageUrls.length,
            currentDate,
            co2PlotUrl: getCO2PlotUrl(currentDate)
        });
        setShowImages(prev => !prev);
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
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "FileImage" }}
                            title={t("tooltips.showImages")}
                            ariaLabel={t("tooltips.showImages")}
                            onClick={handleImagesClick}
                            disabled={false}
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
                    <strong className={styles.sectionTitle}>{t("headerTexts.supportingContent")}:</strong>
                    <div className={styles.contextContent}>
                        {answer.context.map((msg, i) => (
                            <div key={i} className={styles.contextItem}>
                                {msg.role && (
                                    <div className={styles.contextRole}>
                                        <b>{msg.role}:</b>
                                    </div>
                                )}
                                <div className={styles.contextText}>
                                    <ReactMarkdown 
                                        children={DOMPurify.sanitize(msg.content)}
                                        rehypePlugins={[rehypeRaw]} 
                                        remarkPlugins={[remarkGfm]}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Stack.Item>
            )}

            {/* Show images section with CO2 plot navigation */}
            {showImages && (
                <Stack.Item>
                    <strong className={styles.sectionTitle}>{t("headerTexts.co2Plot")}:</strong>
                    <div className={styles.imagesContainer}>
                        <div className={styles.dateNavigation}>
                            <IconButton
                                iconProps={{ iconName: "ChevronLeft" }}
                                title={t("tooltips.previousDay")}
                                ariaLabel={t("tooltips.previousDay")}
                                onClick={navigateToPreviousDay}
                                style={{ color: "black" }}
                            />
                            <span className={styles.currentDate}>
                                {currentDate.toLocaleDateString()}
                            </span>
                            <IconButton
                                iconProps={{ iconName: "ChevronRight" }}
                                title={t("tooltips.nextDay")}
                                ariaLabel={t("tooltips.nextDay")}
                                onClick={navigateToNextDay}
                                disabled={currentDate.toDateString() === new Date().toDateString()}
                                style={{ color: "black" }}
                            />
                            <IconButton
                                iconProps={{ iconName: "Calendar" }}
                                title={t("tooltips.today")}
                                ariaLabel={t("tooltips.today")}
                                onClick={navigateToToday}
                                style={{ color: "black", marginLeft: "8px" }}
                            />
                        </div>
                        
                        <div className={styles.co2PlotContainer}>
                            {isLoadingImage && (
                                <div className={styles.loadingIndicator}>
                                    {t("labels.loading")}...
                                </div>
                            )}
                            
                            {!imageError ? (
                                <div className={styles.imageWrapper}>
                                    <img 
                                        src={getCO2PlotUrl(currentDate)}
                                        alt={`CO₂ Plot for ${currentDate.toLocaleDateString()}`}
                                        className={styles.chartImage}
                                        onClick={() => window.open(getCO2PlotUrl(currentDate), '_blank')}
                                        onLoad={() => {
                                            setIsLoadingImage(false);
                                            setImageError(false);
                                        }}
                                        onError={() => {
                                            setIsLoadingImage(false);
                                            setImageError(true);
                                        }}
                                        onLoadStart={() => setIsLoadingImage(true)}
                                    />
                                    <p className={styles.imageCaption}>
                                        CO₂ Intensity Plot - {currentDate.toLocaleDateString()}
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.errorMessage}>
                                    <p>{t("errors.imageNotAvailable")}</p>
                                    <p className={styles.errorSubtext}>
                                        {t("errors.imageNotAvailableForDate", { date: currentDate.toLocaleDateString() })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Show context images as fallback if available */}
                        {contextImageUrls.length > 0 && (
                            <>
                                <div className={styles.sectionDivider}></div>
                                <strong>{t("headerTexts.additionalImages")}:</strong>
                                <div className={styles.imageGrid}>
                                    {contextImageUrls.map((url: string, i: number) => (
                                        <div key={i} className={styles.imageWrapper}>
                                            <img 
                                                src={url} 
                                                alt={`Chart ${i + 1}`}
                                                className={styles.chartImage}
                                                onClick={() => window.open(url, '_blank')}
                                                onError={(e) => {
                                                    console.error(`Failed to load image: ${url}`);
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <p className={styles.imageCaption}>
                                                {(() => {
                                                    const filename = url.split('/').pop();
                                                    if (!filename) return `Chart ${i + 1}`;
                                                    
                                                    // Format filename into a readable caption
                                                    return filename
                                                        .replace(/\.(png|jpg|jpeg|gif)$/i, '')
                                                        .replace(/_/g, ' ')
                                                        .replace(/co2plot/i, 'CO₂ Plot')
                                                        .replace(/\b\w/g, (l: string) => l.toUpperCase());
                                                })()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </Stack.Item>
            )}
        </Stack>
    );
};