const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, context, message) => {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp: getTimestamp(),
      level,
      context,
      message,
    });
  }
  return `[${getTimestamp()}] [${level}] [${context}] ${message}`;
};

export const logger = {
  info: (context, message) => {
    console.log(formatMessage('INFO', context, message));
  },

  warn: (context, message) => {
    console.warn(formatMessage('WARN', context, message));
  },

  error: (context, message, error = null) => {
    const msg = error ? `${message}: ${error.message}` : message;
    console.error(formatMessage('ERROR', context, msg));
    if (error && error.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  },
};

// Made with Bob
