/// <reference types="bun-types" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

// Environment variables (VITE_ prefix for compatibility)
declare namespace NodeJS {
  interface ProcessEnv {
    VITE_API_BASE_URL?: string;
    VITE_FIREBASE_API_KEY?: string;
    VITE_FIREBASE_AUTH_DOMAIN?: string;
    VITE_FIREBASE_PROJECT_ID?: string;
    VITE_FIREBASE_STORAGE_BUCKET?: string;
    VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    VITE_FIREBASE_APP_ID?: string;
  }
}
