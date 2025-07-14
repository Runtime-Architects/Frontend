import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { 
    PrimaryButton, 
    TextField, 
    MessageBar, 
    MessageBarType, 
    Spinner, 
    Stack, 
    Text,
    Link,
    Checkbox
} from "@fluentui/react";
import { useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import styles from "./Auth.module.css";
import { loginBegin, loginComplete } from "../../api";
import { isWebAuthnSupported, isSecureContext } from "../../utils/webauthn";
import { storeAuthData, isAuthenticated } from "../../utils/auth";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshAuthState } = useAuth();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isWebAuthnCompatible, setIsWebAuthnCompatible] = useState(false);

    // Check WebAuthn compatibility on component mount
    useEffect(() => {
        // Redirect if already authenticated
        if (isAuthenticated()) {
            navigate('/');
            return;
        }
        
        const checkCompatibility = () => {
            if (!isWebAuthnSupported()) {
                setError(t("auth.passkeysNotSupported", "Passkeys are not supported on this device"));
                return;
            }
            
            if (!isSecureContext()) {
                setError(t("auth.secureContextRequired", "This page must be accessed over HTTPS"));
                return;
            }
            
            setIsWebAuthnCompatible(true);
        };
        
        checkCompatibility();
    }, [t, navigate]);

    const handleEmailChange = (value: string) => {
        setEmail(value);
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleLogin = async () => {
        if (!isWebAuthnCompatible) {
            setError(t("auth.passkeysNotSupported", "Passkeys are not supported on this device"));
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Step 1: Begin login
            const loginOptions = await loginBegin(
                { email: email.trim() }
            );

            console.log('Login options received:', loginOptions);

            // Step 2: Use native WebAuthn API - DON'T modify what the authenticator provides
            const credential = await startAuthentication({
                optionsJSON: loginOptions
            });

            console.log('WebAuthn credential obtained:', credential);

            // Step 3: Complete login - send exactly what the authenticator provided
            const result = await loginComplete(credential);
            
            setSuccess(t("auth.loginSuccess", "Login successful! Welcome back, {{email}}!", {
                email: result.user.email
            }));
            
            // Store authentication data using the auth utility
            storeAuthData({
                access_token: result.access_token,
                token_type: result.token_type,
                expires_in: result.expires_in,
                user: result.user
            });
            
            // Refresh auth state in context
            refreshAuthState();
            
            // Redirect to main app
            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (err) {
            if (err instanceof Error) {
                // Handle specific WebAuthn errors
                if (err.message.includes("user denied") || 
                    err.message.includes("not allowed by the user agent") ||
                    err.message.includes("The operation either timed out or was not allowed")) {
                    setError(t("auth.userDeniedAuth", "Authentication was cancelled. Please try again and allow the passkey prompt."));
                } else if (err.message.includes("InvalidStateError")) {
                    setError(t("auth.invalidState", "Authentication failed. Please try again or use a different device."));
                } else if (err.message.includes("NotSupportedError")) {
                    setError(t("auth.notSupported", "Passkey authentication is not supported on this device."));
                } else if (err.message.includes("SecurityError")) {
                    setError(t("auth.securityError", "Security error. Please ensure you're accessing this page over HTTPS."));
                } else if (err.message.includes("TimeoutError")) {
                    setError(t("auth.timeoutError", "Authentication timed out. Please try again."));
                } else {
                    setError(err.message);
                }
            } else {
                setError(t("auth.loginFailed", "Login failed. Please try again."));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("auth.loginTitle", "Login")}</title>
            </Helmet>
            
            <div className={styles.authCard}>
                <div className={styles.headerSection}>
                    <h1 className={styles.title}>{t("auth.welcomeBack", "Welcome Back")}</h1>
                    <Text variant="medium" className={styles.subtitle}>
                        {t("auth.loginSubtitle", "Sign in using your passkey")}
                    </Text>
                </div>

                <div className={styles.content}>
                    {error && (
                        <MessageBar messageBarType={MessageBarType.error} isMultiline>
                            {error}
                        </MessageBar>
                    )}
                    
                    {success && (
                        <MessageBar messageBarType={MessageBarType.success} isMultiline>
                            {success}
                        </MessageBar>
                    )}

                    <Stack tokens={{ childrenGap: 20 }}>
                        {(
                            <TextField
                                label={t("auth.email", "Email")}
                                type="email"
                                value={email}
                                onChange={(_, value) => handleEmailChange(value || '')}
                                placeholder={t("auth.emailPlaceholder", "Enter your email address")}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        )}

                        <div className={styles.buttonContainer}>
                            <PrimaryButton
                                text={isLoading ? t("auth.signingIn", "Signing in...") : t("auth.signIn", "Sign In")}
                                onClick={handleLogin}
                                disabled={isLoading || (!email.trim())}
                                iconProps={isLoading ? undefined : { iconName: "Fingerprint" }}
                            />
                            
                            {isLoading && (
                                <div className={styles.loadingContainer}>
                                    <Spinner size={2} label={t("auth.processingLogin", "Processing login...")} />
                                </div>
                            )}
                        </div>

                        <div className={styles.linkContainer}>
                            <Text variant="medium">
                                {t("auth.noAccount", "Don't have an account?")} {" "}
                                <Link href="/register" underline>
                                    {t("auth.registerHere", "Register here")}
                                </Link>
                            </Text>
                        </div>

                        <div className={styles.infoContainer}>
                            <MessageBar messageBarType={MessageBarType.info} isMultiline>
                                <Text variant="small">
                                    {t("auth.passkeyInfo", "This application uses passkeys for secure authentication. Make sure your device supports passkeys (biometric authentication, security keys, or device PIN).")}
                                </Text>
                            </MessageBar>
                        </div>
                    </Stack>
                </div>
            </div>
        </div>
    );
};

export default Login;
