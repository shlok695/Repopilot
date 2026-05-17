import { jest } from '@jest/globals';

// ─── Mock fs and config before importing ─────────────────────────────

const mockExistsSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockOpenSync = jest.fn();
const mockReadSync = jest.fn();
const mockCloseSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    openSync: mockOpenSync,
    readSync: mockReadSync,
    closeSync: mockCloseSync,
  },
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  openSync: mockOpenSync,
  readSync: mockReadSync,
  closeSync: mockCloseSync,
}));

jest.unstable_mockModule('../config.js', () => ({
  config: {
    TMP_DIR: '/tmp/repopilot',
  },
}));

jest.unstable_mockModule('../logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { validateGitHubUrl, validateZipFile, validateScanRequest } = await import('../validateRepo.js');

// ─── Helpers ─────────────────────────────────────────────────────────

function mockRequest(body = {}, file = undefined) {
  return { body, file };
}

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

// ─── validateGitHubUrl ───────────────────────────────────────────────

describe('validateGitHubUrl', () => {
  test('valid URL passes', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo');
    expect(result.valid).toBe(true);
    expect(result.sanitisedUrl).toBe('https://github.com/owner/repo');
    expect(result.error).toBeUndefined();
  });

  test('valid URL with .git suffix passes', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo.git');
    expect(result.valid).toBe(true);
  });

  test('URL with trailing whitespace is trimmed', () => {
    const result = validateGitHubUrl('  https://github.com/owner/repo  ');
    expect(result.valid).toBe(true);
    expect(result.sanitisedUrl).toBe('https://github.com/owner/repo');
  });

  test('URL with uppercase scheme is normalised', () => {
    const result = validateGitHubUrl('HTTPS://github.com/owner/repo');
    expect(result.valid).toBe(true);
    expect(result.sanitisedUrl).toBe('https://github.com/owner/repo');
  });

  test('empty string fails', () => {
    const result = validateGitHubUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  test('null / undefined fails', () => {
    expect(validateGitHubUrl(null).valid).toBe(false);
    expect(validateGitHubUrl(undefined).valid).toBe(false);
  });

  test('missing https:// fails', () => {
    const result = validateGitHubUrl('http://github.com/owner/repo');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('https://github.com/');
  });

  test('non-GitHub URL fails', () => {
    const result = validateGitHubUrl('https://gitlab.com/owner/repo');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('github.com');
  });

  test('missing repo name fails (only owner)', () => {
    const result = validateGitHubUrl('https://github.com/owner');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('owner and repository');
  });

  test('shell injection: semicolon blocked', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo;rm -rf /');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('injection');
  });

  test('shell injection: backtick blocked', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo`whoami`');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('injection');
  });

  test('shell injection: pipe blocked', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo|cat /etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('injection');
  });

  test('shell injection: dollar sign blocked', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo$HOME');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('injection');
  });

  test('shell injection: ampersand blocked', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo&&echo pwned');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('injection');
  });

  test('known monorepo is rejected', () => {
    const result = validateGitHubUrl('https://github.com/torvalds/linux');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });

  test('>2 path segments adds warning but still valid', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo/tree/main');
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('segments');
  });
});

// ─── validateZipFile ─────────────────────────────────────────────────

describe('validateZipFile', () => {
  test('valid ZIP file passes', () => {
    const file = {
      originalname: 'project.zip',
      mimetype: 'application/zip',
      size: 1024 * 1024, // 1 MB
      buffer: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]),
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(true);
  });

  test('undefined file fails', () => {
    const result = validateZipFile(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  test('null file fails', () => {
    const result = validateZipFile(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  test('wrong mimetype fails', () => {
    const file = {
      originalname: 'project.zip',
      mimetype: 'text/plain',
      size: 1024,
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  test('wrong extension fails', () => {
    const file = {
      originalname: 'project.tar.gz',
      mimetype: 'application/zip',
      size: 1024,
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.zip');
  });

  test('file too large fails (>25 MB)', () => {
    const file = {
      originalname: 'huge.zip',
      mimetype: 'application/zip',
      size: 30 * 1024 * 1024, // 30 MB
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
    expect(result.error).toContain('25');
  });

  test('file at exactly 25 MB passes', () => {
    const file = {
      originalname: 'exact.zip',
      mimetype: 'application/zip',
      size: 25 * 1024 * 1024, // exactly 25 MB
      buffer: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]),
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(true);
  });

  test('invalid PK signature fails (buffer)', () => {
    const file = {
      originalname: 'fake.zip',
      mimetype: 'application/zip',
      size: 1024,
      buffer: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid file header');
  });

  test('valid PK signature passes (buffer)', () => {
    const file = {
      originalname: 'valid.zip',
      mimetype: 'application/zip',
      size: 1024,
      buffer: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF]),
    };
    const result = validateZipFile(file);
    expect(result.valid).toBe(true);
  });
});

// ─── validateScanRequest (Express middleware) ────────────────────────

describe('validateScanRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no rate limit hit
    mockExistsSync.mockReturnValue(false);
  });

  test('valid GitHub request calls next()', () => {
    const req = mockRequest({ type: 'github', repoUrl: 'https://github.com/owner/repo' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('sanitised URL is written back to req.body', () => {
    const req = mockRequest({ type: 'github', repoUrl: '  HTTPS://github.com/owner/repo/  ' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.repoUrl).toBe('https://github.com/owner/repo');
  });

  test('invalid type returns 400', () => {
    const req = mockRequest({ type: 'ftp', repoUrl: 'https://github.com/owner/repo' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: expect.stringContaining('Invalid scan type'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('missing type returns 400', () => {
    const req = mockRequest({});
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('invalid GitHub URL returns 400', () => {
    const req = mockRequest({ type: 'github', repoUrl: 'not-a-url' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('shell injection in URL returns 400', () => {
    const req = mockRequest({ type: 'github', repoUrl: 'https://github.com/owner/repo;rm -rf /' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('injection'),
    }));
  });

  test('missing ZIP file returns 400', () => {
    const req = mockRequest({ type: 'zip' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('required'),
    }));
  });

  test('rate limit exceeded returns 429', () => {
    // Simulate >10 scan folders
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(
      Array.from({ length: 12 }, (_, i) => ({
        name: `scan_${i}`,
        isDirectory: () => true,
      }))
    );

    const req = mockRequest({ type: 'github', repoUrl: 'https://github.com/owner/repo' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('concurrent'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('within rate limit allows request', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(
      Array.from({ length: 5 }, (_, i) => ({
        name: `scan_${i}`,
        isDirectory: () => true,
      }))
    );

    const req = mockRequest({ type: 'github', repoUrl: 'https://github.com/owner/repo' });
    const res = mockResponse();
    const next = mockNext();

    validateScanRequest(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
