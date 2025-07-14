/**
 * Authentication utility for managing tokens and user data
 * Now using secure cookie-based storage instead of localStorage
 */

export interface User {
    id: number;
    email: string;
}

export interface AuthData {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
    expires_at: number; // Calculated expiration timestamp
}

// Cookie names
const AUTH_TOKEN_COOKIE = 'auth_token';
const USER_DATA_COOKIE = 'user_data';
const TOKEN_EXPIRES_COOKIE = 'token_expires_at';

/**
 * Cookie utility functions
 */
const setCookie = (name: string, value: string, maxAge: number, httpOnly: boolean = false, secure: boolean = true, sameSite: 'Strict' | 'Lax' | 'None' = 'Strict'): void => {
    try {
        let cookieString = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/`;
        
        if (httpOnly) {
            cookieString += '; HttpOnly';
        }
        
        if (secure && window.location.protocol === 'https:') {
            cookieString += '; Secure';
        }
        
        cookieString += `; SameSite=${sameSite}`;
        
        document.cookie = cookieString;
    } catch (error) {
        console.error('Failed to set cookie:', error);
    }
};

const getCookie = (name: string): string | null => {
    try {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to get cookie:', error);
        return null;
    }
};

const deleteCookie = (name: string): void => {
    try {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
        console.error('Failed to delete cookie:', error);
    }
};

/**
 * Store authentication data after successful login
 */
export const storeAuthData = (loginResponse: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}): void => {
    try {
        // Calculate expiration timestamp (current time + expires_in seconds)
        const expiresAt = Date.now() + (loginResponse.expires_in * 1000);
        
        // Set cookies with expiration
        const maxAge = loginResponse.expires_in; // seconds
        
        setCookie(AUTH_TOKEN_COOKIE, loginResponse.access_token, maxAge, false, true, 'Strict');
        setCookie(USER_DATA_COOKIE, JSON.stringify(loginResponse.user), maxAge, false, true, 'Strict');
        setCookie(TOKEN_EXPIRES_COOKIE, expiresAt.toString(), maxAge, false, true, 'Strict');
        
        console.log('Auth data stored in cookies successfully');
    } catch (error) {
        console.error('Failed to store auth data:', error);
    }
};

/**
 * Get the current access token
 */
export const getAccessToken = (): string | null => {
    try {
        const token = getCookie(AUTH_TOKEN_COOKIE);
        if (!token) return null;
        
        // Check if token is expired
        if (isTokenExpired()) {
            clearAuthData();
            return null;
        }
        
        return token;
    } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
    }
};

/**
 * Get the current user data
 */
export const getUserData = (): User | null => {
    try {
        const userData = getCookie(USER_DATA_COOKIE);
        if (!userData) return null;
        
        // Check if token is expired
        if (isTokenExpired()) {
            clearAuthData();
            return null;
        }
        
        return JSON.parse(userData);
    } catch (error) {
        console.error('Failed to get user data:', error);
        return null;
    }
};

/**
 * Check if the current token is expired
 */
export const isTokenExpired = (): boolean => {
    try {
        const expiresAt = getCookie(TOKEN_EXPIRES_COOKIE);
        if (!expiresAt) return true;
        
        const expirationTime = parseInt(expiresAt, 10);
        const currentTime = Date.now();
        
        // Add a 5-minute buffer to refresh token before it actually expires
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        return currentTime >= (expirationTime - bufferTime);
    } catch (error) {
        console.error('Failed to check token expiration:', error);
        return true;
    }
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
    const token = getAccessToken();
    const user = getUserData();
    return !!(token && user && !isTokenExpired());
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): Record<string, string> => {
    const token = getAccessToken();
    if (!token) return {};
    
    return {
        'Authorization': `Bearer ${token}`
    };
};

/**
 * Clear all authentication data (logout)
 */
export const clearAuthData = (): void => {
    try {
        deleteCookie(AUTH_TOKEN_COOKIE);
        deleteCookie(USER_DATA_COOKIE);
        deleteCookie(TOKEN_EXPIRES_COOKIE);
        console.log('Auth data cleared from cookies');
    } catch (error) {
        console.error('Failed to clear auth data:', error);
    }
};

/**
 * Get time remaining until token expires (in seconds)
 */
export const getTokenTimeRemaining = (): number => {
    try {
        const expiresAt = getCookie(TOKEN_EXPIRES_COOKIE);
        if (!expiresAt) return 0;
        
        const expirationTime = parseInt(expiresAt, 10);
        const currentTime = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
        
        return timeRemaining;
    } catch (error) {
        console.error('Failed to get token time remaining:', error);
        return 0;
    }
};

/**
 * Get complete auth data if available and valid
 */
export const getCompleteAuthData = (): AuthData | null => {
    const token = getAccessToken();
    const user = getUserData();
    const expiresAt = getCookie(TOKEN_EXPIRES_COOKIE);
    
    if (!token || !user || !expiresAt || isTokenExpired()) {
        return null;
    }
    
    return {
        access_token: token,
        token_type: 'bearer',
        expires_in: getTokenTimeRemaining(),
        user,
        expires_at: parseInt(expiresAt, 10)
    };
};

/**
 * Logout function that clears auth data and redirects
 */
export const logout = (navigate?: (path: string) => void): void => {
    clearAuthData();
    if (navigate) {
        navigate('/login');
    } else {
        // Fallback if navigate is not available
        window.location.href = '/login';
    }
};
