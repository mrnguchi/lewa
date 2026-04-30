import axios from 'axios';

const TECHNICAL_ERROR_PATTERNS = [
  'AxiosError',
  'Network Error',
  'Request failed',
  'Prisma',
  'ConnectorError',
  'stack',
  'SQL',
  'undefined',
  'null',
];

const hasTechnicalDetails = (message: string) =>
  TECHNICAL_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  ) || message.includes('\n');

const getServerMessage = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as { message?: unknown; error?: unknown };
  const candidate =
    typeof payload.message === 'string'
      ? payload.message
      : typeof payload.error === 'string'
        ? payload.error
        : null;

  if (!candidate || hasTechnicalDetails(candidate)) {
    return null;
  }

  return candidate;
};

export const getFriendlyErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (error.code === 'ECONNABORTED') {
    return 'The request took too long. Please check your connection and try again.';
  }

  if (!error.response) {
    return 'Unable to connect right now. Please check your internet connection.';
  }

  const serverMessage = getServerMessage(error.response.data);
  if (serverMessage) {
    return serverMessage;
  }

  switch (error.response.status) {
    case 400:
      return 'Please check your information and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you requested.';
    case 409:
      return 'This action conflicts with existing information.';
    case 422:
      return 'Some details need correction before continuing.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server is having trouble right now. Please try again shortly.';
    default:
      return fallback;
  }
};
