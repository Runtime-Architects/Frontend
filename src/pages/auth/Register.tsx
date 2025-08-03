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
    Link
} from "@fluentui/react";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";
import styles from "./Auth.module.css";
import { registerBegin, registerComplete } from "../../api";
import { isWebAuthnSupported, isSecureContext } from "../../utils/webauthn";

const Register = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isWebAuthnCompatible, setIsWebAuthnCompatible] = useState(false);

    // Check WebAuthn compatibility on component mount
    useEffect(() => {
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
    }, [t]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const validateForm = () => {
        if (!formData.email.trim()) {
            setError(t("auth.emailRequired", "Email is required"));
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError(t("auth.emailInvalid", "Please enter a valid email address"));
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        
        if (!isWebAuthnCompatible) {
            setError(t("auth.passkeysNotSupported", "Passkeys are not supported on this device"));
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Step 1: Begin registration
            const registerOptions = await registerBegin({
                email: formData.email
            });

            // Debug logging
            console.log('Registration options from backend:', registerOptions);

            // Step 2: Create WebAuthn credential using SimpleWebAuthn
            // DON'T modify what the authenticator provides - send exactly what it returns
            const credential = await startRegistration({
                optionsJSON: registerOptions
            });

            console.log('WebAuthn credential created:', credential);

            // Step 3: Complete registration - send exactly what the authenticator provided
            const result = await registerComplete(credential);
            
            setSuccess(t("auth.registrationSuccess", "Registration successful! You can now login."));
            
            // Redirect to login page after successful registration
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(t("auth.registrationFailed", "Registration failed. Please try again."));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("auth.registerTitle", "Register")}</title>
            </Helmet>
            
            <div className={styles.authCard}>
                <div className={styles.headerSection}>
                    <h1 className={styles.title}>{t("auth.createAccount", "Create Account")}</h1>
                    <Text variant="medium" className={styles.subtitle}>
                        {t("auth.registerSubtitle", "Register with your passkey for secure authentication")}
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
                        <TextField
                            label={t("auth.email", "Email")}
                            type="email"
                            value={formData.email}
                            onChange={(_, value) => handleInputChange('email', value || '')}
                            placeholder={t("auth.emailPlaceholder", "Enter your email address")}
                            required
                            disabled={isLoading}
                            autoComplete="email"
                        />

                        <div className={styles.buttonContainer}>
                            <PrimaryButton
                                text={isLoading ? t("auth.registering", "Registering...") : t("auth.register", "Register")}
                                onClick={handleRegister}
                                disabled={isLoading || !formData.email.trim()}
                                iconProps={isLoading ? undefined : { iconName: "Fingerprint" }}
                            />
                            
                            {isLoading && (
                                <div className={styles.loadingContainer}>
                                    <Spinner size={2} label={t("auth.processingRegistration", "Processing registration...")} />
                                </div>
                            )}
                        </div>

                        <div className={styles.linkContainer}>
                            <Text variant="medium">
                                {t("auth.alreadyHaveAccount", "Already have an account?")} {" "}
                                <Link href="/login" underline>
                                    {t("auth.loginHere", "Login here")}
                                </Link>
                            </Text>
                        </div>
                    </Stack>
                </div>
            </div>
        </div>
    );
};

export default Register;
