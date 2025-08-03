import { config } from '../utils/config';
import { getAccessToken, isTokenExpired } from '../utils/auth';


const BACKEND_URI = config.backendUri;

// Health check response types
export type HealthCheckComponents = {
    agents_status: "initialized" | "not_initialized";
    openai_client_status: "connected" | "not_connected";
    openai_api_status: "healthy" | "quota_exceeded" | "invalid_key" | "forbidden" | "error" | "unknown";
    api_key_configured: boolean;
    data_directory_exists: boolean;
    data_files_count: number;
};

export type HealthCheckResponse = {
    status: "healthy" | "warning" | "error" | "unhealthy";
    message: string;
    timestamp?: string;
    components?: HealthCheckComponents;
    api_error?: string | null;
    version?: string;
    uptime_check?: string;
};

// Import the type for clarity
export type ChatAppResponse = {
    message: { content: string; role: string };
    context?: Array<{ content: string; role: string; name?: string }>;
    delta?: any;
    session_state?: any;
};

// Type definition for the streaming event structure
export type StreamingEvent = {
    event: {
        event_type: "started" | "agent_thinking" | "agent_response" | "completed" | "error";
        timestamp: string;
        agent_name: string;
        message: string;
        data: {
            question?: string;
            progress: number;
            final_response?: string;
            full_content?: string;
            content_type?: string;
            total_messages?: number;
            agent_count?: number;
            response_length?: number;
            error?: string;
            conversation_id?: number;
            context?: Array<{ content: string; role: string; name?: string }> | string;
        };
    };
};

export async function askApiStream(
    question: string,
    onEvent: (event: StreamingEvent) => void
): Promise<number | null> {
    const response = await fetch(`${BACKEND_URI}/ask-stream`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ question })
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";
    let conversationId: number | null = null;

    while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                // Skip empty lines and lines that don't start with "data:"
                if (!trimmedLine || !trimmedLine.startsWith("data:")) {
                    continue;
                }
                
                try {
                    // Extract JSON from "data: {json}" format
                    const jsonString = trimmedLine.substring(5).trim(); // Remove "data:" prefix
                    const eventData = JSON.parse(jsonString) as StreamingEvent;
                    
                    // Extract conversation_id from the first event
                    if (eventData.event.data.conversation_id && !conversationId) {
                        conversationId = eventData.event.data.conversation_id;
                    }
                    
                    onEvent(eventData);
                } catch (error) {
                    console.warn("Failed to parse streaming event:", trimmedLine, error);
                }
            }
        }
    }
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
        const trimmedBuffer = buffer.trim();
        if (trimmedBuffer.startsWith("data:")) {
            try {
                const jsonString = trimmedBuffer.substring(5).trim();
                const eventData = JSON.parse(jsonString) as StreamingEvent;
                
                // Extract conversation_id from the final event if not yet set
                if (eventData.event.data.conversation_id && !conversationId) {
                    conversationId = eventData.event.data.conversation_id;
                }
                
                onEvent(eventData);
            } catch (error) {
                console.warn("Failed to parse final streaming event:", trimmedBuffer, error);
            }
        }
    }
    
    return conversationId;
}

// Function for continuing conversations with existing conversation ID
export async function askConversationStream(
    conversationId: number,
    question: string,
    onEvent: (event: StreamingEvent) => void
): Promise<void> {
    const response = await fetch(`${BACKEND_URI}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ question })
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                // Skip empty lines and lines that don't start with "data:"
                if (!trimmedLine || !trimmedLine.startsWith("data:")) {
                    continue;
                }
                
                try {
                    // Extract JSON from "data: {json}" format
                    const jsonString = trimmedLine.substring(5).trim(); // Remove "data:" prefix
                    const eventData = JSON.parse(jsonString) as StreamingEvent;
                    onEvent(eventData);
                } catch (error) {
                    console.warn("Failed to parse streaming event:", trimmedLine, error);
                }
            }
        }
    }
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
        const trimmedBuffer = buffer.trim();
        if (trimmedBuffer.startsWith("data:")) {
            try {
                const jsonString = trimmedBuffer.substring(5).trim();
                const eventData = JSON.parse(jsonString) as StreamingEvent;
                onEvent(eventData);
            } catch (error) {
                console.warn("Failed to parse final streaming event:", trimmedBuffer, error);
            }
        }
    }
}

// Helper function to handle streaming with typed callbacks for new conversations
export async function askApiStreamWithHandlers(
    question: string,
    handlers: {
        onStarted?: (event: StreamingEvent) => void;
        onAgentThinking?: (event: StreamingEvent) => void;
        onAgentResponse?: (event: StreamingEvent) => void;
        onCompleted?: (event: StreamingEvent) => void;
        onError?: (event: StreamingEvent) => void;
        onProgress?: (progress: number, agent: string, message: string) => void;
        onConversationCreated?: (conversationId: number) => void;
    }
): Promise<{ response: string | null; conversationId: number | null }> {
    let finalResponse: string | null = null;
    let streamingError: Error | null = null;
    let conversationId: number | null = null;

    conversationId = await askApiStream(question, (event) => {
        // Call conversation created handler when we get the conversation ID
        if (event.event.data.conversation_id && handlers.onConversationCreated) {
            handlers.onConversationCreated(event.event.data.conversation_id);
        }

        // Call progress handler for all events except errors
        if (handlers.onProgress && event.event.event_type !== "error") {
            handlers.onProgress(
                event.event.data.progress,
                event.event.agent_name,
                event.event.message
            );
        }

        // Call specific event handlers
        switch (event.event.event_type) {
            case "started":
                handlers.onStarted?.(event);
                break;
            case "agent_thinking":
                handlers.onAgentThinking?.(event);
                break;
            case "agent_response":
                handlers.onAgentResponse?.(event);
                break;
            case "completed":
                handlers.onCompleted?.(event);
                // Extract final response from either field (prioritize full_content)
                if (event.event.data.full_content) {
                    finalResponse = event.event.data.full_content;
                } else if (event.event.data.final_response) {
                    finalResponse = event.event.data.final_response;
                }
                break;
            case "error":
                handlers.onError?.(event);
                streamingError = new Error(event.event.message);
                break;
        }
    });

    // If there was a streaming error, throw it
    if (streamingError) {
        throw streamingError;
    }

    return { response: finalResponse, conversationId };
}

// Helper function to handle streaming with typed callbacks for continuing conversations
export async function askConversationStreamWithHandlers(
    conversationId: number,
    question: string,
    handlers: {
        onStarted?: (event: StreamingEvent) => void;
        onAgentThinking?: (event: StreamingEvent) => void;
        onAgentResponse?: (event: StreamingEvent) => void;
        onCompleted?: (event: StreamingEvent) => void;
        onError?: (event: StreamingEvent) => void;
        onProgress?: (progress: number, agent: string, message: string) => void;
    }
): Promise<string | null> {
    let finalResponse: string | null = null;
    let streamingError: Error | null = null;

    await askConversationStream(conversationId, question, (event) => {
        // Call progress handler for all events except errors
        if (handlers.onProgress && event.event.event_type !== "error") {
            handlers.onProgress(
                event.event.data.progress,
                event.event.agent_name,
                event.event.message
            );
        }

        // Call specific event handlers
        switch (event.event.event_type) {
            case "started":
                handlers.onStarted?.(event);
                break;
            case "agent_thinking":
                handlers.onAgentThinking?.(event);
                break;
            case "agent_response":
                handlers.onAgentResponse?.(event);
                break;
            case "completed":
                handlers.onCompleted?.(event);
                // Extract final response from either field (prioritize full_content)
                if (event.event.data.full_content) {
                    finalResponse = event.event.data.full_content;
                } else if (event.event.data.final_response) {
                    finalResponse = event.event.data.final_response;
                }
                break;
            case "error":
                handlers.onError?.(event);
                streamingError = new Error(event.event.message);
                break;
        }
    });

    // If there was a streaming error, throw it
    if (streamingError) {
        throw streamingError;
    }

    return finalResponse;
}

export async function askApi(question: string): Promise<ChatAppResponse> {
    const response = await fetch(`${BACKEND_URI}/ask`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ question })
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    // Now returns the full object as expected by the frontend
    // DEBUG:
    console.log("API Response:", data);
    return data;
}

export function getHeaders() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    
    // Add authorization header if available
    try {
        if (typeof window !== 'undefined') {
            // Check if token is not expired first
            if (!isTokenExpired()) {
                const token = getAccessToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                } else {
                    console.debug("No auth token available");
                }
            } else {
                console.debug("Token has expired, not including in headers");
            }
        }
    } catch (error) {
        // Auth header not available, continue without it
        console.debug("Auth header not available:", error);
    }
    
    return headers;
}

export async function checkHealth(): Promise<HealthCheckResponse> {
    try {
        const response = await fetch(`${BACKEND_URI}/health`, {
            method: "GET",
            headers: getHeaders()
        });

        if (!response.ok) {
            throw new Error(`Health check failed with status ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to check backend health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Authentication types
export type RegisterBeginRequest = {
    email: string;
};

export type RegisterBeginResponse = {
    challenge: string;
    rp: {
        id: string;
        name: string;
    };
    user: {
        id: string;
        name: string;
        displayName: string;
    };
    pubKeyCredParams: Array<{
        type: "public-key";
        alg: number;
    }>;
    timeout: number;
    attestation: "none" | "indirect" | "direct" | "enterprise";
    authenticatorSelection: {
        userVerification: "required" | "preferred" | "discouraged";
    };
};

export type RegisterCompleteRequest = {
    id: string;
    rawId: string;
    response: {
        clientDataJSON: string;
        attestationObject: string;
        transports?: string[];
        publicKeyAlgorithm?: number;
        publicKey?: string;
        authenticatorData?: string;
    };
    type: string;
    clientExtensionResults: Record<string, any>;
    authenticatorAttachment?: string;
};

export type RegisterCompleteResponse = {
    message: string;
    user_id: number;
};

export type LoginBeginRequest = {
    email?: string;
};

export type LoginBeginResponse = {
    challenge: string;
    timeout: number;
    rpId: string;
    userVerification: "required" | "preferred" | "discouraged";
    allowCredentials: Array<{
        id: string;
        type: "public-key";
        transports?: AuthenticatorTransport[];
    }>;
};

export type LoginCompleteRequest = {
    id: string;
    rawId: string;
    response: {
        clientDataJSON: string;
        authenticatorData: string;
        signature: string;
        userHandle?: string;
    };
    type: string;
    clientExtensionResults: Record<string, any>;
};

export type LoginCompleteResponse = {
    message: string;
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: number;
        email: string;
    };
};

// Conversation API types
export type ConversationListResponse = {
    conversations: {
        id: number;
        title: string;
        updated_at: string;
        created_at: string;
        user_id: number;
    }[];
};

export type ConversationResponse = {
    conversation: {
        id: number;
        title: string;
        updated_at: string;
        created_at: string;
        user_id: number;
    };
    messages: {
        id: number;
        conversation_id: number;
        content: string;
        role: "user" | "assistant";
        timestamp: string;
    }[];
};

export type DeleteConversationResponse = {
    message: string;
};

// Authentication API functions
export async function registerBegin(request: RegisterBeginRequest): Promise<RegisterBeginResponse> {
    try {
        const response = await fetch(`${BACKEND_URI}/auth/register/begin`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Registration failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to begin registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function registerComplete(request: RegisterCompleteRequest): Promise<RegisterCompleteResponse> {
    try {
        const response = await fetch(`${BACKEND_URI}/auth/register/complete`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Registration completion failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to complete registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function loginBegin(request: LoginBeginRequest = {}): Promise<LoginBeginResponse> {
    try {
        const response = await fetch(`${BACKEND_URI}/auth/login/begin`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Login initiation failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to begin login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function loginComplete(request: LoginCompleteRequest): Promise<LoginCompleteResponse> {
    try {
        const response = await fetch(`${BACKEND_URI}/auth/login/complete`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Login completion failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to complete login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Conversation types
export type Conversation = {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
};

// Conversation API functions
export async function getConversationsApi(token?: string): Promise<ConversationListResponse> {
    try {
        const headers = getHeaders();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${BACKEND_URI}/conversations`, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to get conversations: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getConversationApi(conversationId: number, token?: string): Promise<ConversationResponse> {
    try {
        const headers = getHeaders();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${BACKEND_URI}/conversations/${conversationId}`, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to get conversation: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteConversationApi(conversationId: number, token?: string): Promise<DeleteConversationResponse> {
    try {
        const headers = getHeaders();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${BACKEND_URI}/conversations/${conversationId}`, {
            method: "DELETE",
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to delete conversation: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Chat History API functions (mapping to conversation endpoints)
export type ChatHistoryListResponse = {
    sessions: {
        id: string;
        title: string;
        timestamp: number;
    }[];
    continuation_token?: string;
};

export type ChatHistoryResponse = {
    answers: [string, ChatAppResponse][];
};

export type ChatHistoryRequest = {
    id: string;
    answers: [string, ChatAppResponse][];
};

export async function getChatHistoryListApi(count: number, continuationToken?: string, idToken?: string): Promise<ChatHistoryListResponse> {
    try {
        const headers = getHeaders();
        if (idToken) {
            headers.Authorization = `Bearer ${idToken}`;
        }

        // Map conversation API to chat history format
        const conversationsResponse = await getConversationsApi(idToken);
        
        // Convert conversations to chat history format
        const sessions = conversationsResponse.conversations.map(conv => ({
            id: conv.id.toString(),
            title: conv.title,
            timestamp: new Date(conv.updated_at).getTime()
        }));

        // Sort by timestamp descending (newest first)
        sessions.sort((a, b) => b.timestamp - a.timestamp);

        return {
            sessions,
            continuation_token: undefined // Simple implementation without pagination for now
        };
    } catch (error) {
        throw new Error(`Failed to get chat history list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getChatHistoryApi(id: string, idToken?: string): Promise<ChatHistoryResponse> {
    try {
        const conversationResponse = await getConversationApi(parseInt(id), idToken);
        
        // Convert messages to answers format
        const answers: [string, ChatAppResponse][] = [];
        const messages = conversationResponse.messages;
        
        // Group messages into question-answer pairs
        for (let i = 0; i < messages.length; i += 2) {
            if (i + 1 < messages.length) {
                const userMessage = messages[i];
                const assistantMessage = messages[i + 1];
                
                if (userMessage.role === 'user' && assistantMessage.role === 'assistant') {
                    answers.push([
                        userMessage.content,
                        {
                            message: { content: assistantMessage.content, role: assistantMessage.role },
                            context: []
                        }
                    ]);
                }
            }
        }

        return { answers };
    } catch (error) {
        throw new Error(`Failed to get chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function postChatHistoryApi(request: ChatHistoryRequest, idToken?: string): Promise<void> {
    // For now, this is a no-op since conversation saving is handled by the backend
    // In the future, this could be implemented to save conversations
    console.log('Chat history save requested but not implemented yet');
}

export async function deleteChatHistoryApi(id: string, idToken?: string): Promise<void> {
    try {
        await deleteConversationApi(parseInt(id), idToken);
    } catch (error) {
        throw new Error(`Failed to delete chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// CO2 Plot API functions
export interface CO2PlotRequest {
    date: string; // YYYY-MM-DD format
    plotType?: 'day' | 'month'; // Default to 'day'
}

export interface CO2PlotResponse {
    imageUrl: string;
    date: string;
    plotType: string;
    available: boolean;
}

export async function getCO2PlotApi(request: CO2PlotRequest, idToken?: string): Promise<CO2PlotResponse> {
    const { date, plotType = 'day' } = request;
    
    // Since the backend API endpoint doesn't exist yet, directly construct the image URL
    // This maintains the API interface while using direct image access
    const imageUrl = `${BACKEND_URI}/images/co2plot_${plotType}_all_${date}_${date}.png`;
    
    // For now, always return available=true and let the image loading handle errors
    // In the future, this could check if the image exists via HEAD request
    return {
        imageUrl,
        date,
        plotType,
        available: true
    };
    
    /* TODO: Uncomment this when the backend API is implemented
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add authorization if token is provided
        if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`${BACKEND_URI}/api/co2plot`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                date,
                plot_type: plotType
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Image not available for this date
                return {
                    imageUrl: '',
                    date,
                    plotType,
                    available: false
                };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return {
            imageUrl: result.image_url || imageUrl,
            date,
            plotType,
            available: true
        };
    } catch (error) {
        console.error('Error fetching CO2 plot:', error);
        // Fallback to direct URL construction if API fails
        return {
            imageUrl,
            date,
            plotType,
            available: true // Assume available, let the image loading handle errors
        };
    }
    */
}

// Helper function to check if CO2 plot is available for a specific date
export async function checkCO2PlotAvailabilityApi(date: string, plotType: 'day' | 'month' = 'day', idToken?: string): Promise<boolean> {
    // Since the backend API endpoint doesn't exist yet, always return true
    // Let the image loading handle the actual availability check
    return true;
    
    /* TODO: Uncomment this when the backend API is implemented
    try {
        const headers: Record<string, string> = {};

        if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`${BACKEND_URI}/api/co2plot/check?date=${date}&plot_type=${plotType}`, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            const result = await response.json();
            return result.available || false;
        }
        return false;
    } catch (error) {
        console.error('Error checking CO2 plot availability:', error);
        return false;
    }
    */
}