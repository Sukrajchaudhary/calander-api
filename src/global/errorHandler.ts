import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';
import config from '../config/config';

interface FieldError {
  field: string;
  message: string;
}

interface ErrorResponse {
  title: string;
  message: string;
  errors?: FieldError[];
}

export const globalErrorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDevelopment = config.app.env === 'development';

  let statusCode = 500;
  let title = 'Internal Server Error';
  let message = 'An error occurred while processing your request';
  let fieldErrors: FieldError[] | undefined = undefined;

  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    title = 'Validation Error';
    message = error.message;
    if ((error as any).fields) {
      fieldErrors = (error as any).fields.map((f: any) => ({
        field: f.field,
        message: f.message,
      }));
    }
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    title = getErrorTitle(statusCode);
    message = error.message;
  } else if (error instanceof Error) {
    if (isDevelopment) {
      message = error.message;
    }
    console.error('Internal Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }

  const errorResponse: ErrorResponse = {
    title,
    message,
    ...(fieldErrors && { errors: fieldErrors }),
  };

  if (isDevelopment) {
    console.error('Error:', {
      statusCode,
      title,
      message,
      errors: fieldErrors,
      path: _req.path,
      method: _req.method,
    });
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  res.status(statusCode).json(errorResponse);
};

function getErrorTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return titles[statusCode] || 'Error';
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    title: 'Not Found',
    message: 'Route not found',
  };
  res.status(404).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
