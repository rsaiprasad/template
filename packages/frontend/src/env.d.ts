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

// Augment bun:test matchers with @testing-library/jest-dom
// See: https://bun.sh/docs/guides/test/testing-library
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'bun:test' {
  interface Matchers<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers {}
}

// Environment variables (PUBLIC_ prefix for client-exposed variables)
declare namespace NodeJS {
  interface ProcessEnv {
    PUBLIC_API_BASE_URL?: string;
    PUBLIC_FIREBASE_API_KEY?: string;
    PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    PUBLIC_FIREBASE_PROJECT_ID?: string;
    PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    PUBLIC_FIREBASE_APP_ID?: string;
  }
}
