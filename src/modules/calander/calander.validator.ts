import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../errors/AppError';

export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            const fieldErrors = errors.array().map((err: any) => {
                  const fieldName = err.path || err.param || 'unknown';
                  return {
                        field: fieldName,
                        message: err.msg,
                        type: err.type || 'field',
                  };
            });
            throw new ValidationError('Validation failed', fieldErrors);
      }
      next();
};

export const validateCreateEvent = [
      body('title')
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),
      body('description')
            .optional()
            .trim(),
      body('startDate')
            .isISO8601()
            .toDate()
            .withMessage('Start date must be a valid date'),
      body('endDate')
            .isISO8601()
            .toDate()
            .withMessage('End date must be a valid date')
            .custom((endDate, { req }) => {
                  if (req.body.startDate && endDate < req.body.startDate) {
                        throw new Error('End date must be after start date');
                  }
                  return true;
            }),
      body('location')
            .optional()
            .trim(),
      body('isAllDay')
            .optional()
            .isBoolean()
            .withMessage('isAllDay must be a boolean'),
      body('status')
            .optional()
            .isIn(['draft', 'published', 'cancelled'])
            .withMessage('Status must be draft, published, or cancelled'),
      handleValidationErrors,
];

export const validateUpdateEvent = [
      param('id').isMongoId().withMessage('Invalid event ID'),
      body('title')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),
      body('description')
            .optional()
            .trim(),
      body('startDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Start date must be a valid date'),
      body('endDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('End date must be a valid date'),
      body('location')
            .optional()
            .trim(),
      body('isAllDay')
            .optional()
            .isBoolean()
            .withMessage('isAllDay must be a boolean'),
      body('status')
            .optional()
            .isIn(['draft', 'published', 'cancelled'])
            .withMessage('Status must be draft, published, or cancelled'),
      handleValidationErrors,
];

export const validateEventId = [
      param('id').isMongoId().withMessage('Invalid event ID'),
      handleValidationErrors,
];

export const validateGetEvents = [
      query('startDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Start date must be a valid date'),
      query('endDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('End date must be a valid date'),
      query('status')
            .optional()
            .isIn(['draft', 'published', 'cancelled'])
            .withMessage('Status must be draft, published, or cancelled'),
      handleValidationErrors,
];
