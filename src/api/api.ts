const BACKEND_URI = "http://localhost:8000";

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
        };
    };
};

export async function askApiStream(
    question: string,
    onEvent: (event: StreamingEvent) => void
): Promise<void> {
    const response = await fetch(`${BACKEND_URI}/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

// Helper function to handle streaming with typed callbacks
export async function askApiStreamWithHandlers(
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

    await askApiStream(question, (event) => {
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
        headers: { "Content-Type": "application/json" },
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
        // Use dynamic import to avoid circular dependencies
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token) {
                // Check if token is expired
                const expiresAt = localStorage.getItem('token_expires_at');
                if (expiresAt) {
                    const expirationTime = parseInt(expiresAt, 10);
                    const currentTime = Date.now();
                    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
                    
                    if (currentTime < (expirationTime - bufferTime)) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }
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