import { Spinner } from "@fluentui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HistoryData, HistoryItem } from "../HistoryItem";
import { Answers, HistoryProviderOptions } from "../HistoryProviders/IProvider";
import { useHistoryManager, HistoryMetaData } from "../HistoryProviders";
import { useTranslation } from "react-i18next";
import { getAccessToken } from "../../utils/auth";
import styles from "./HistorySidebar.module.css";

const HISTORY_COUNT_PER_LOAD = 20;

export const HistorySidebar = ({
    provider,
    onChatSelected,
    refreshTrigger
}: {
    provider: HistoryProviderOptions;
    onChatSelected?: (answers: Answers, conversationId?: string) => void;
    refreshTrigger?: number;
}) => {
    const historyManager = useHistoryManager(provider);
    const [history, setHistory] = useState<HistoryMetaData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const navigate = useNavigate();

    const { t } = useTranslation();

    // Load initial history when component mounts
    useEffect(() => {
        loadMoreHistory();
    }, []);

    // Refresh history when trigger changes
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            console.log('Refreshing history due to trigger change');
            // Reset and reload history
            setHistory([]);
            setHasMoreHistory(true);
            historyManager.resetContinuationToken();
            // Use setTimeout to avoid race condition with the above state updates
            setTimeout(() => {
                loadMoreHistory();
            }, 0);
        }
    }, [refreshTrigger]);

    const loadMoreHistory = async () => {
        if (isLoading) {
            console.log('HistorySidebar: loadMoreHistory called but already loading, skipping');
            return;
        }
        
        console.log('HistorySidebar: loadMoreHistory starting');
        setIsLoading(true);
        const token = getAccessToken();
        const items = await historyManager.getNextItems(HISTORY_COUNT_PER_LOAD, token || undefined);
        console.log(`HistorySidebar: received ${items.length} items from history manager`);
        
        if (items.length === 0) {
            setHasMoreHistory(false);
        }
        
        // Use functional state update to ensure we have the latest history when filtering
        setHistory(prevHistory => {
            // Filter out items that already exist in the current history
            const uniqueItems = items.filter(item => !prevHistory.some(existing => existing.id === item.id));
            console.log(`HistorySidebar: ${items.length} items received, ${uniqueItems.length} unique items, current history has ${prevHistory.length} items`);
            
            if (uniqueItems.length !== items.length) {
                console.warn('HistorySidebar: Some duplicate items were filtered out:', 
                    items.filter(item => prevHistory.some(existing => existing.id === item.id)));
            }
            
            return [...prevHistory, ...uniqueItems];
        });
        
        setIsLoading(false);
        console.log('HistorySidebar: loadMoreHistory completed');
    };

    const handleSelect = async (id: string) => {
        if (onChatSelected) {
            // If onChatSelected is provided (we're in chat mode), load the conversation data
            try {
                const token = getAccessToken();
                const conversationData = await historyManager.getItem(id, token || undefined);
                if (conversationData) {
                    onChatSelected(conversationData, id);
                } else {
                    console.warn("No conversation data found for ID:", id);
                }
            } catch (error) {
                console.error("Failed to load conversation:", error);
            }
        } else {
            // Navigate to the conversation view page (standalone conversation page)
            navigate(`/conversation/${id}`);
        }
    };

    const handleDelete = async (id: string) => {
        const token = getAccessToken();
        await historyManager.deleteItem(id, token || undefined);
        setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    };

    const groupedHistory = useMemo(() => {
        const grouped = groupHistory(history);
        console.log('Grouped history:', grouped);
        
        // Check for duplicate IDs
        const allIds = history.map(item => item.id);
        const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            console.warn('Duplicate IDs found in history:', duplicateIds);
        }
        
        return grouped;
    }, [history]);

    return (
        <div className={styles.sidebar}>
            <div className={styles.header}>
                <h3 className={styles.title}>{t("history.chatHistory")}</h3>
            </div>
            <div className={styles.content}>
                {Object.entries(groupedHistory).map(([group, items], groupIndex) => (
                    <div key={`group-${groupIndex}-${group}`} className={styles.group}>
                        <p className={styles.groupLabel}>{t(group)}</p>
                        <div className={styles.groupItems}>
                            {items.map((item) => (
                                <HistoryItem key={`history-item-${item.id}`} item={item} onSelect={handleSelect} onDelete={handleDelete} />
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && <Spinner className={styles.spinner} />}
                {history.length === 0 && !isLoading && <p className={styles.noHistory}>{t("history.noHistory")}</p>}
                {hasMoreHistory && !isLoading && <InfiniteLoadingButton func={loadMoreHistory} />}
            </div>
        </div>
    );
};

function groupHistory(history: HistoryData[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);

    return history.reduce(
        (groups, item) => {
            const itemDate = new Date(item.timestamp);
            let group;

            if (itemDate >= today) {
                group = "history.today";
            } else if (itemDate >= yesterday) {
                group = "history.yesterday";
            } else if (itemDate >= lastWeek) {
                group = "history.last7days";
            } else if (itemDate >= lastMonth) {
                group = "history.last30days";
            } else {
                group = itemDate.toLocaleDateString(undefined, { year: "numeric", month: "long" });
            }

            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        },
        {} as Record<string, HistoryData[]>
    );
}

const InfiniteLoadingButton = ({ func }: { func: () => void }) => {
    const buttonRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (buttonRef.current) {
                            func();
                        }
                    }
                });
            },
            {
                root: null,
                threshold: 0
            }
        );

        if (buttonRef.current) {
            observer.observe(buttonRef.current);
        }

        return () => {
            if (buttonRef.current) {
                observer.unobserve(buttonRef.current);
            }
        };
    }, []);

    return <button ref={buttonRef} onClick={func} className={styles.loadMoreButton} />;
};