import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    User, 
    AuthData, 
    isAuthenticated, 
    getUserData, 
    getCompleteAuthData, 
    clearAuthData,
} from '../utils/auth';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    authData: AuthData | null;
    loading: boolean;
    logout: () => void;
    refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuth, setIsAuth] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [authData, setAuthData] = useState<AuthData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const refreshAuthState = () => {
        try {
            const authenticated = isAuthenticated();
            const userData = getUserData();
            const completeAuthData = getCompleteAuthData();
            
            setIsAuth(authenticated);
            setUser(userData);
            setAuthData(completeAuthData);
        } catch (error) {
            console.error('Error refreshing auth state:', error);
            setIsAuth(false);
            setUser(null);
            setAuthData(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        console.log('Logging out user...');
        clearAuthData();
        setIsAuth(false);
        setUser(null);
        setAuthData(null);
        
        // Redirect to login
        window.location.href = '/login';
    };

    // Initialize auth state on mount
    useEffect(() => {
        refreshAuthState();
    }, []);

    // Set up token expiration check
    useEffect(() => {
        if (!isAuth || !authData) return;

        // Check token expiration periodically
        const checkInterval = setInterval(() => {
            if (!isAuthenticated()) {
                console.log('Token expired, logging out...');
                logout();
            }
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }, [isAuth, authData, logout]); // Add logout to dependencies

    const value: AuthContextType = {
        isAuthenticated: isAuth,
        user,
        authData,
        loading,
        logout,
        refreshAuthState
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
