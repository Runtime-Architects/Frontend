import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Stack, 
    Text, 
    DefaultButton, 
    PersonaSize, 
    Persona,
    MessageBar,
    MessageBarType 
} from '@fluentui/react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UserProfile.module.css';

export const UserProfile: React.FC = () => {
    const { t } = useTranslation();
    const { user, authData, logout, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        return (
            <MessageBar messageBarType={MessageBarType.warning}>
                {t('auth.notLoggedIn', 'You are not logged in')}
            </MessageBar>
        );
    }

    const formatTimeRemaining = (seconds: number): string => {
        if (seconds <= 0) return t('auth.expired', 'Expired');
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return t('auth.expiresInHours', '{{hours}}h {{minutes}}m remaining', { hours, minutes });
        } else {
            return t('auth.expiresInMinutes', '{{minutes}} minutes remaining', { minutes });
        }
    };

    return (
        <div className={styles.container}>
            <Stack tokens={{ childrenGap: 20 }}>
                <Stack horizontal tokens={{ childrenGap: 15 }} verticalAlign="center">
                    <Persona
                        text={user.email}
                        size={PersonaSize.size48}
                        initialsColor="darkBlue"
                    />
                    <Stack>
                        <Text variant="mediumPlus">{user.email}</Text>
                        <Text variant="small" className={styles.userId}>
                            {t('auth.userId', 'User ID')}: {user.id}
                        </Text>
                    </Stack>
                </Stack>

                {authData && (
                    <Stack tokens={{ childrenGap: 10 }}>
                        <Text variant="medium" className={styles.sectionTitle}>
                            {t('auth.sessionInfo', 'Session Information')}
                        </Text>
                        <Stack tokens={{ childrenGap: 5 }}>
                            <Text variant="small">
                                <strong>{t('auth.tokenType', 'Token Type')}:</strong> {authData.token_type}
                            </Text>
                            <Text variant="small">
                                <strong>{t('auth.expiresIn', 'Expires')}:</strong> {formatTimeRemaining(authData.expires_in)}
                            </Text>
                        </Stack>
                    </Stack>
                )}

                <DefaultButton
                    text={t('auth.logout', 'Logout')}
                    onClick={logout}
                    iconProps={{ iconName: 'SignOut' }}
                    className={styles.logoutButton}
                />
            </Stack>
        </div>
    );
};

export default UserProfile;
