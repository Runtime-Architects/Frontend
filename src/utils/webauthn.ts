// WebAuthn utility functions for browser compatibility

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.navigator !== 'undefined' &&
        typeof window.navigator.credentials !== 'undefined' &&
        typeof window.navigator.credentials.create === 'function' &&
        typeof window.navigator.credentials.get === 'function' &&
        typeof window.PublicKeyCredential !== 'undefined'
    );
}

/**
 * Check if the current context is secure (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
}

/**
 * Convert base64url string to ArrayBuffer
 */
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    // Add padding if needed
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64url string
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Convert ArrayBuffer to base64 string (regular base64, not base64url)
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}

/**
 * Convert backend registration options to format expected by @simplewebauthn/browser
 */
export function convertRegistrationOptions(options: any): PublicKeyCredentialCreationOptions {
    return {
        challenge: base64urlToArrayBuffer(options.challenge),
        rp: options.rp,
        user: {
            id: base64urlToArrayBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        attestation: options.attestation,
        authenticatorSelection: options.authenticatorSelection
    };
}

/**
 * Convert RegistrationResponseJSON to backend format
 */
export function convertRegistrationResponse(response: any): any {
    return {
        id: response.id,
        rawId: response.rawId,
        response: {
            clientDataJSON: response.response.clientDataJSON,
            attestationObject: response.response.attestationObject,
            transports: response.response.transports
        },
        type: response.type,
        clientExtensionResults: response.clientExtensionResults,
        authenticatorAttachment: response.authenticatorAttachment
    };
}

/**
 * Convert backend authentication options to format expected by @simplewebauthn/browser
 */
export function convertAuthenticationOptions(options: any): PublicKeyCredentialRequestOptions {
    return {
        challenge: base64urlToArrayBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification,
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
            id: base64urlToArrayBuffer(cred.id),
            type: cred.type,
            transports: cred.transports
        }))
    };
}

/**
 * Convert AuthenticationResponseJSON to backend format
 */
export function convertAuthenticationResponse(response: any): any {
    return {
        id: response.id,
        rawId: response.rawId,
        response: {
            clientDataJSON: response.response.clientDataJSON,
            authenticatorData: response.response.authenticatorData,
            signature: response.response.signature,
            userHandle: response.response.userHandle
        },
        type: response.type,
        clientExtensionResults: response.clientExtensionResults,
        authenticatorAttachment: response.authenticatorAttachment
    };
}

/**
 * Validate and format WebAuthn registration response before sending to backend
 */
export function validateAndFormatRegistrationResponse(response: any): any {
    // The response from @simplewebauthn/browser should be directly compatible
    // but we can add validation here if needed
    
    if (!response || !response.id || !response.response) {
        throw new Error('Invalid WebAuthn registration response');
    }
    
    if (!response.response.clientDataJSON || !response.response.attestationObject) {
        throw new Error('Missing required fields in WebAuthn registration response');
    }
    
    // Return the response as-is since @simplewebauthn/browser handles the formatting
    return response;
}

/**
 * Debug helper to log WebAuthn registration details
 */
export function debugWebAuthnRegistration(options: any, response: any): void {
    console.log('WebAuthn Registration Debug:');
    console.log('Options received from backend:', JSON.stringify(options, null, 2));
    console.log('Response being sent to backend:', JSON.stringify(response, null, 2));
    
    // Decode base64 values for debugging
    try {
        const decodedUserId = atob(options.user.id);
        console.log('Decoded user ID:', decodedUserId);
        
        const decodedChallenge = atob(options.challenge);
        console.log('Decoded challenge:', decodedChallenge);
    } catch (error) {
        console.log('Error decoding base64 values:', error);
    }
}

/**
 * Advanced debugging for WebAuthn registration issues
 */
export function advancedWebAuthnDebug(options: any, credential: any): void {
    console.group('🔍 Advanced WebAuthn Debug');
    
    try {
        // Parse the clientDataJSON to see what's actually being sent
        const clientDataJSON = JSON.parse(atob(credential.response.clientDataJSON));
        console.log('📋 Parsed clientDataJSON:', clientDataJSON);
        
        // Compare challenges
        console.log('⚡ Challenge comparison:');
        console.log('  Original challenge:', options.challenge);
        console.log('  Challenge in clientDataJSON:', clientDataJSON.challenge);
        console.log('  Challenges match:', options.challenge === clientDataJSON.challenge);
        
        // Check other critical fields
        console.log('🌐 Origin check:');
        console.log('  Origin in clientDataJSON:', clientDataJSON.origin);
        console.log('  Expected origin: http://localhost:5001');
        
        console.log('📝 Type check:');
        console.log('  Type in clientDataJSON:', clientDataJSON.type);
        console.log('  Expected type: webauthn.create');
        
        // Check credential ID consistency
        console.log('🔑 Credential ID check:');
        console.log('  Credential ID:', credential.id);
        console.log('  Raw ID (base64url):', credential.rawId);
        
        // Check user ID from options
        console.log('👤 User ID check:');
        console.log('  User ID in options:', options.user.id);
        console.log('  User ID decoded:', atob(options.user.id));
        
    } catch (error) {
        console.error('❌ Error in advanced debug:', error);
    }
    
    console.groupEnd();
}

/**
 * Create a test challenge to verify WebAuthn flow
 */
export function createTestChallenge(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return arrayBufferToBase64url(array.buffer);
}

/**
 * Verify that the challenge roundtrip works correctly
 */
export function verifyChallengeRoundtrip(originalChallenge: string, clientDataJSON: string): boolean {
    try {
        const clientData = JSON.parse(atob(clientDataJSON));
        const challengeFromClient = clientData.challenge;
        
        console.log('🔍 Challenge roundtrip verification:');
        console.log('  Original challenge:', originalChallenge);
        console.log('  Original length:', originalChallenge.length);
        console.log('  Challenge from client:', challengeFromClient);
        console.log('  Client length:', challengeFromClient.length);
        console.log('  Direct match:', originalChallenge === challengeFromClient);
        
        // Check if it's just a padding issue
        const isPaddingIssue = originalChallenge.replace(/=+$/, '') === challengeFromClient;
        console.log('  Is padding issue:', isPaddingIssue);
        
        // Use normalized comparison to handle base64/base64url differences
        const normalizedMatch = compareBase64Challenges(originalChallenge, challengeFromClient);
        console.log('  Normalized match:', normalizedMatch);
        
        return normalizedMatch;
    } catch (error) {
        console.error('❌ Error verifying challenge roundtrip:', error);
        return false;
    }
}

/**
 * Create proper WebAuthn authentication response using native API
 * DON'T modify what the authenticator provides - this is the correct approach
 */
export async function createNativeAuthenticationResponse(options: any): Promise<any> {
    // Use native WebAuthn API directly
    const credential = await navigator.credentials.get({
        publicKey: options
    }) as PublicKeyCredential;

    if (!credential) {
        throw new Error('No credential returned from authenticator');
    }

    const response = credential.response as AuthenticatorAssertionResponse;

    // Return exactly what the authenticator provides, properly encoded
    return {
        id: credential.id,
        rawId: credential.id, // For SimpleWebAuthn compatibility
        response: {
            clientDataJSON: arrayBufferToBase64(response.clientDataJSON), // NEVER modify this
            authenticatorData: arrayBufferToBase64(response.authenticatorData),
            signature: arrayBufferToBase64(response.signature),
            userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : null
        },
        type: credential.type
    };
}
