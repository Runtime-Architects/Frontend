const BACKEND_URI = "http://localhost:8000";

// Health check response type
export type HealthCheckResponse = {
    status: string;
    message: string;
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
        event_type: "started" | "agent_thinking" | "agent_response" | "completed";
        timestamp: string;
        agent_name: string;
        message: string;
        data: {
            question?: string;
            progress: number;
            final_response?: string;
            total_messages?: number;
            agent_count?: number;
            response_length?: number;
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
        onProgress?: (progress: number, agent: string, message: string) => void;
    }
): Promise<string | null> {
    let finalResponse: string | null = null;

    await askApiStream(question, (event) => {
        // Call progress handler for all events
        if (handlers.onProgress) {
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
                // Extract final response if available
                if (event.event.data.final_response) {
                    finalResponse = event.event.data.final_response;
                }
                break;
        }
    });

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
    return {
        "Content-Type": "application/json"
    };
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