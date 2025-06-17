import { renderToStaticMarkup } from "react-dom/server";
import { ChatAppResponse } from "../../api";

type HtmlParsedAnswer = {
    answerHtml: string;
    citations: string[];
};

export function parseAnswerToHtml(
    answer: ChatAppResponse,
    isStreaming: boolean,
    onCitationClicked: (citationFilePath: string) => void
): HtmlParsedAnswer {
    // Just display the message content, since context is now an array of messages
    const parsedAnswer = answer.message.content.trim();

    return {
        answerHtml: parsedAnswer,
        citations: []
    };
}