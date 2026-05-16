export const validateGitHubUrl = (repoUrl) => {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new Error('Repository URL is required');
  }

  if (!repoUrl.startsWith('https://github.com/')) {
    throw new Error('Invalid GitHub URL. Must start with https://github.com/');
  }

  // Check for shell metacharacters
  if (/[;&|`$()]/.test(repoUrl)) {
    throw new Error('Invalid characters in repository URL');
  }

  return true;
};

export const validateZipFile = (file) => {
  if (!file) {
    throw new Error('ZIP file is required');
  }

  const validMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
  ];

  if (!validMimeTypes.includes(file.mimetype) && !file.originalname.endsWith('.zip')) {
    throw new Error('Invalid file type. Only ZIP files are allowed');
  }

  const maxSizeMB = parseInt(process.env.MAX_ZIP_SIZE_MB || '25', 10);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds maximum of ${maxSizeMB}MB`);
  }

  return true;
};

export const validateScanRequest = (req, res, next) => {
  try {
    const { type, repoUrl } = req.body;

    if (!type || (type !== 'github' && type !== 'zip')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid scan type. Must be "github" or "zip"',
      });
    }

    if (type === 'github') {
      validateGitHubUrl(repoUrl);
    } else if (type === 'zip') {
      validateZipFile(req.file);
    }

    next();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

// Made with Bob
