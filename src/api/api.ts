const BACKEND_URI = "http://localhost:8000";

// Import the type for clarity
export type ChatAppResponse = {
    message: { content: string; role: string };
    context?: Array<{ content: string; role: string; name?: string }>;
    delta?: any;
    session_state?: any;
};

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