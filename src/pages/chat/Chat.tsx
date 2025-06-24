import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import appLogo from "../../assets/applogo.svg";
import styles from "./Chat.module.css";

import { askApi, ChatAppResponse } from "../../api";
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

    const { t, i18n } = useTranslation();
    const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(true);

    const makeApiRequest = async (question: string) => {
        lastQuestionRef.current = question;
        setError(undefined);
        setIsLoading(true);

        try {
            const data = await askApi(question);

            setAnswers([
                ...answers,
                [question, data]
            ]);
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
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
                                        <AnswerLoading />
                                    </div>
                                </>
                            )}
                            {error ? (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
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