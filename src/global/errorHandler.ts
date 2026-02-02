import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';
import config from '../config/config';

interface FieldError {
  field: string;
  message: string;
  type: string;
}

interface ErrorResponse {
  success: false;
  error: {
    statusCode: number;
    message: string;
    fields?: FieldError[];
    [key: string]: any;
  };
  timestamp: string;
  path?: string;
  method?: string;
}

export const globalErrorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDevelopment = config.app.env === 'development';

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorDetails: any = {};
  let fieldErrors: FieldError[] | undefined = undefined;

  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    message = error.message;
    // Check if error has field-level validation errors
    if ((error as any).fields) {
      fieldErrors = (error as any).fields;
      message = 'Validation failed';
    }
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Error) {
    // In production, don't expose internal error messages
    if (isDevelopment) {
      message = error.message;
      errorDetails.stack = error.stack;
    } else {
      // Generic message for production to prevent information disclosure
      message = 'An error occurred while processing your request';
      // Log full error details server-side only
      console.error('Internal Error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      statusCode,
      message,
      ...(fieldErrors && { fields: fieldErrors }),
      ...errorDetails,
    },
    timestamp: new Date().toISOString(),
    path: _req.path,
    method: _req.method,
  };

  // Remove sensitive data in production
  if (!isDevelopment) {
    delete errorResponse.path;
    delete errorResponse.method;
  }

  // Log error details (sanitized for production)
  const logData: any = {
    statusCode,
    message: isDevelopment ? message : 'Error occurred',
    timestamp: new Date().toISOString(),
  };
  
  if (isDevelopment) {
    logData.fields = fieldErrors;
    logData.path = _req.path;
    logData.method = _req.method;
  }
  
  // Always log full details server-side
  console.error('Error:', logData);
  
  if (isDevelopment && error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      statusCode: 404,
      message: 'Route not found',
    },
    timestamp: new Date().toISOString(),
    path: _req.path,
    method: _req.method,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
