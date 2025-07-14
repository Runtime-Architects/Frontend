import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DefaultButton, Stack, Text, MessageBar, MessageBarType } from '@fluentui/react';

export const AuthTestComponent: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();

    const handleLogout = () => {
        console.log('Test component: Calling logout...');
        logout();
    };

    const checkLocalStorage = () => {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        const expires = localStorage.getItem('token_expires_at');
        
        console.log('LocalStorage check:', {
            token: token ? 'exists' : 'not found',
            userData: userData ? 'exists' : 'not found',
            expires: expires ? 'exists' : 'not found'
        });
        
        alert(`LocalStorage - Token: ${token ? 'exists' : 'not found'}, User: ${userData ? 'exists' : 'not found'}`);
    };

    return (
        <Stack tokens={{ childrenGap: 15 }} style={{ padding: 20, maxWidth: 400 }}>
            <Text variant="large">Auth Test Component</Text>
            
            {isAuthenticated ? (
                <MessageBar messageBarType={MessageBarType.success}>
                    Authenticated as: {user?.email}
                </MessageBar>
            ) : (
                <MessageBar messageBarType={MessageBarType.warning}>
                    Not authenticated
                </MessageBar>
            )}
            
            <Stack tokens={{ childrenGap: 10 }}>
                <DefaultButton
                    text="Test Logout"
                    onClick={handleLogout}
                    iconProps={{ iconName: "SignOut" }}
                />
                <DefaultButton
                    text="Check LocalStorage"
                    onClick={checkLocalStorage}
                    iconProps={{ iconName: "Search" }}
                />
            </Stack>
        </Stack>
    );
};

export default AuthTestComponent;
