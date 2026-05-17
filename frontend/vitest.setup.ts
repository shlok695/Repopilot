import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest's expect with jest-dom matchers and jest-axe
expect.extend(matchers);
expect.extend(toHaveNoViolations);

window.URL.createObjectURL = window.URL.createObjectURL || (() => 'blob:test');
window.URL.revokeObjectURL = window.URL.revokeObjectURL || (() => undefined);
window.alert = () => undefined;
window.scrollTo = () => undefined;

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: () => Promise.resolve(),
  },
});

if (typeof window.PromiseRejectionEvent === 'undefined') {
  class TestPromiseRejectionEvent extends Event {
    promise: Promise<unknown>;
    reason: unknown;

    constructor(type: string, eventInitDict: PromiseRejectionEventInit) {
      super(type, eventInitDict);
      this.promise = eventInitDict.promise;
      this.reason = eventInitDict.reason;
    }
  }

  Object.defineProperty(window, 'PromiseRejectionEvent', {
    configurable: true,
    value: TestPromiseRejectionEvent,
  });

  Object.defineProperty(globalThis, 'PromiseRejectionEvent', {
    configurable: true,
    value: TestPromiseRejectionEvent,
  });
}

// Mock window.matchMedia for dark mode tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Made with Bob
