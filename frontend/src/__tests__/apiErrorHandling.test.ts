import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { handleApiError } from '../api/scanApi';

vi.mock('axios');

describe('API Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should handle network error (no response)', () => {
      const error = {
        isAxiosError: true,
        response: undefined,
        request: {},
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'Could not reach the server. Is the backend running?'
      );
    });

    it('should handle HTTP 400 with backend message', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid repository URL' },
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow('Invalid repository URL');
    });

    it('should handle HTTP 400 with fallback message', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'Invalid request. Please check your input.'
      );
    });

    it('should handle HTTP 413 (file too large)', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 413,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'ZIP file is too large. Please upload a file smaller than 100 MB.'
      );
    });

    it('should handle HTTP 429 (rate limit)', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'Rate limit reached. Try again in 60 seconds.'
      );
    });

    it('should handle HTTP 503 (timeout)', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 503,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'Scan timed out. Try a smaller repository.'
      );
    });

    it('should handle HTTP 500 (server error)', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'Something went wrong while scanning. Please try a public repository or upload a ZIP file.'
      );
    });

    it('should show a friendly message for private or unavailable repos', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Repository not found or inaccessible repository' },
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow(
        'This repository appears to be private or unavailable. Please use a public GitHub repository or upload a ZIP file instead.'
      );
    });

    it('should handle other HTTP errors', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 418,
          data: {},
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow('Scan failed. Please try again.');
    });

    it('should handle non-Axios errors', () => {
      const error = new Error('Some random error');

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

      expect(() => handleApiError(error)).toThrow(
        'Unexpected error occurred. Please try again.'
      );
    });

    it('should extract error message from "error" field', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Custom error message' },
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow('Custom error message');
    });

    it('should extract error message from "detail" field', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { detail: 'Detail error message' },
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      expect(() => handleApiError(error)).toThrow('Detail error message');
    });
  });
});

// Made with Bob
