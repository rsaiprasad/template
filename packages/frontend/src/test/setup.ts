import { afterEach, expect, mock } from 'bun:test';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (happy-dom doesn't implement it)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mock((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: mock(() => {}),
    removeListener: mock(() => {}),
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {}),
    dispatchEvent: mock(() => false),
  })),
});

// Mock IntersectionObserver
if (!window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe = mock(() => {});
    unobserve = mock(() => {});
    disconnect = mock(() => {});
  }
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// Mock ResizeObserver
if (!window.ResizeObserver) {
  class MockResizeObserver {
    observe = mock(() => {});
    unobserve = mock(() => {});
    disconnect = mock(() => {});
  }
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}
