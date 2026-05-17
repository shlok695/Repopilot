import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

window.URL.createObjectURL = window.URL.createObjectURL || (() => 'blob:test');
window.URL.revokeObjectURL = window.URL.revokeObjectURL || (() => undefined);
window.alert = () => undefined;

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Made with Bob
