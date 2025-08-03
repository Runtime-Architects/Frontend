import { IHistoryProvider, Answers, HistoryProviderOptions, HistoryMetaData } from "./IProvider";
import { getConversationsApi, getConversationApi, deleteConversationApi } from "../../api";
import { ChatAppResponse } from "../../api";

export class ConversationProvider implements IHistoryProvider {
    getProviderName = () => HistoryProviderOptions.CosmosDB; // Reusing the CosmosDB option for now

    private isItemEnd: boolean = false;

    resetContinuationToken() {
        console.log("ConversationProvider: resetContinuationToken called");
        this.isItemEnd = false;
    }

    async getNextItems(count: number, idToken?: string): Promise<HistoryMetaData[]> {
        console.log(`ConversationProvider: getNextItems called, isItemEnd=${this.isItemEnd}`);
        
        if (this.isItemEnd) {
            console.log("ConversationProvider: already ended, returning empty array");
            return [];
        }

        try {
            console.log("ConversationProvider: fetching conversations from API");
            const response = await getConversationsApi(idToken);
            this.isItemEnd = true; // Mark as ended since we load all conversations at once
            
            const result = response.conversations.map(conversation => ({
                id: conversation.id.toString(),
                title: conversation.title,
                timestamp: new Date(conversation.updated_at).getTime()
            }));
            
            console.log(`ConversationProvider: returning ${result.length} conversations`);
            return result;
        } catch (e) {
            console.error("Failed to get conversations:", e);
            this.isItemEnd = true; // Mark as ended even on error to prevent infinite retries
            return [];
        }
    }

    async addItem(id: string, answers: Answers, idToken?: string): Promise<void> {
        // For now, we don't implement adding conversations here
        // The backend should handle conversation creation during chat
        console.log("Adding conversation is handled by the backend during chat");
        return;
    }

    async getItem(id: string, idToken?: string): Promise<Answers | null> {
        try {
            const conversationId = parseInt(id);
            const response = await getConversationApi(conversationId, idToken);
            
            // Convert messages to the Answers format
            const answers: Answers = [];
            
            // Group messages by user/assistant pairs, handling incomplete conversations
            for (let i = 0; i < response.messages.length; i++) {
                const message = response.messages[i];
                
                if (message.role === "user") {
                    // Look for the next assistant message
                    const nextMessage = response.messages[i + 1];
                    
                    if (nextMessage && nextMessage.role === "assistant") {
                        // Complete pair: user question + assistant answer
                        const chatResponse: ChatAppResponse = {
                            message: { content: nextMessage.content, role: "assistant" },
                            context: []
                        };
                        answers.push([message.content, chatResponse]);
                        i++; // Skip the assistant message in the next iteration
                    } else {
                        // Incomplete conversation: user question without assistant answer
                        const chatResponse: ChatAppResponse = {
                            message: { 
                                content: "[Incomplete conversation - no response was generated]", 
                                role: "assistant" 
                            },
                            context: []
                        };
                        answers.push([message.content, chatResponse]);
                    }
                }
            }
            
            return answers;
        } catch (e) {
            console.error("Failed to get conversation:", e);
            return null;
        }
    }

    async deleteItem(id: string, idToken?: string): Promise<void> {
        try {
            const conversationId = parseInt(id);
            await deleteConversationApi(conversationId, idToken);
        } catch (e) {
            console.error("Failed to delete conversation:", e);
            throw e;
        }
    }
}