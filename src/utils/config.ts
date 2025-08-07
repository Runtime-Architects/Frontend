interface Config {
  backendUri: string;
  environment: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  mode: string;
}

// Environment validation
const validateEnvironment = (): void => {
  const requiredVars: (keyof ImportMetaEnv)[] = ['VITE_BACKEND_URI'];
  const missing: string[] = [];

  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      missing.push(String(varName));
    }
  });

  if (missing.length > 0 && import.meta.env.PROD) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your environment configuration');
  }

  // Log current environment for debugging (development only)
  if (import.meta.env.DEV) {
    console.log('Environment Configuration:', {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
      backendUri: import.meta.env.VITE_BACKEND_URI
    });
  }
};

// Run validation
validateEnvironment();

// Export configuration
export const config: Config = {
  backendUri: import.meta.env.VITE_BACKEND_URI || "https://20.238.202.250:8000",
  environment: import.meta.env.MODE || "development",
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
  isStaging: import.meta.env.MODE === "staging",
  mode: import.meta.env.MODE || "development"
};

// Helper functions
export const getBackendUrl = (path: string = ""): string => {
  const baseUrl = config.backendUri.endsWith('/') 
    ? config.backendUri.slice(0, -1) 
    : config.backendUri;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export default config;
