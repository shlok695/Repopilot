export const LOG_BUFFER_SIZE = 50;
const logBuffer = [];

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, context, message, options = {}) => {
  const { durationMs, scanId, ip } = options;
  const timestamp = getTimestamp();
  
  const logObject = {
    timestamp,
    level,
    context,
    message,
    ...(durationMs !== undefined && { durationMs }),
    ...(scanId && { scanId }),
    ...(ip && { ip })
  };

  // Keep buffer size at 50
  if (logBuffer.length >= LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
  logBuffer.push(logObject);

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logObject);
  }
  
  let formatted = `[${timestamp}] [${level}] [${context}]`;
  if (scanId) formatted += ` [${scanId}]`;
  formatted += ` ${message}`;
  if (durationMs !== undefined) formatted += ` (${durationMs}ms)`;
  if (ip) formatted += ` (IP: ${ip})`;
  
  return formatted;
};

export const logger = {
  info: (context, message, options = {}) => {
    console.log(formatMessage('INFO', context, message, options));
  },

  warn: (context, message, options = {}) => {
    console.warn(formatMessage('WARN', context, message, options));
  },

  error: (context, message, errorOrOptions = {}) => {
    let errorObj = null;
    let opts = {};
    
    if (errorOrOptions instanceof Error) {
      errorObj = errorOrOptions;
    } else {
      opts = errorOrOptions || {};
      if (opts.error instanceof Error) {
        errorObj = opts.error;
      }
    }
    
    const msg = errorObj ? `${message}: ${errorObj.message}` : message;
    console.error(formatMessage('ERROR', context, msg, opts));
    
    if (errorObj && errorObj.stack && process.env.NODE_ENV !== 'production') {
      console.error(errorObj.stack);
    }
  },
};

/**
 * Returns the last 50 log lines from the in-memory ring buffer.
 */
export const getLogs = () => [...logBuffer];

/**
 * Express middleware to serve the logs for demo purposes.
 */
export const getLogsHandler = (req, res) => {
  res.json(getLogs());
};

// Made with Bob
