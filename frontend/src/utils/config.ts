// Environment configuration utility
export const config = {
  env: import.meta.env.VITE_APP_ENV || 'development',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  enableMockAuth: import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  
  get isDevelopment() {
    return this.env === 'development';
  },
  
  get isProduction() {
    return this.env === 'production';
  },
};

// Debug logger that only logs in development
export const logger = {
  log: (...args: unknown[]) => {
    if (config.enableDebug) {
      console.log('[DEV]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (config.enableDebug) {
      console.warn('[DEV WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors
    console.error('[ERROR]', ...args);
  },
};

export default config;
