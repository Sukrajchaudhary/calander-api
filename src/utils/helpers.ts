export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const generateErrorCode = (statusCode: number, resource: string): string => {
  const codes: { [key: number]: string } = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return `${codes[statusCode] || 'ERROR'}_${resource.toUpperCase()}`;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeObject = (obj: any): any => {
  const sanitized = { ...obj };
  delete sanitized.password;
  delete sanitized.__v;
  return sanitized;
};
export const escapeRegex = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const sanitizeSearchString = (search: string | undefined, maxLength: number = 100): string => {
  if (!search || typeof search !== 'string') {
    return '';
  }
    const trimmed = search.trim().slice(0, maxLength);
    return escapeRegex(trimmed);
};

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

export const getPaginationParams = (
  queryPage?: string | unknown,
  queryLimit?: string | unknown,
  options: PaginationOptions = {}
): PaginationParams => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100
  } = options;

  const page = parseInt(queryPage as string) || defaultPage;
  const limit = parseInt(queryLimit as string) || defaultLimit;

  if (page < 1) {
    throw new Error('Page must be greater than 0');
  }

  if (limit < 1 || limit > maxLimit) {
    throw new Error(`Limit must be between 1 and ${maxLimit}`);
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};