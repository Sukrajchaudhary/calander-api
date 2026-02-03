import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { IErrorResponse, IErrorDetail } from './calander.interface';

// Time format regex
const TIME_FORMAT = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Days of week
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Recurrence types
const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'];

/**
 * Unified validation error handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            const fieldErrors: IErrorDetail[] = errors.array().map((err: any) => ({
                  field: err.path || err.param || 'unknown',
                  message: err.msg,
            }));

            const errorResponse: IErrorResponse = {
                  title: 'Validation Error',
                  message: 'Invalid input data',
                  errors: fieldErrors,
            };

            res.status(400).json(errorResponse);
            return;
      }
      next();
};

/**
 * Custom validator: Validate time slot array
 */
const validateTimeSlots = (value: any[]): boolean => {
      if (!Array.isArray(value) || value.length === 0) {
            throw new Error('At least one time slot is required');
      }

      for (let i = 0; i < value.length; i++) {
            const slot = value[i];
            if (!slot.startTime || !slot.endTime) {
                  throw new Error(`Time slot ${i + 1}: Both startTime and endTime are required`);
            }
            if (!TIME_FORMAT.test(slot.startTime)) {
                  throw new Error(`Time slot ${i + 1}: Invalid startTime format (use HH:mm)`);
            }
            if (!TIME_FORMAT.test(slot.endTime)) {
                  throw new Error(`Time slot ${i + 1}: Invalid endTime format (use HH:mm)`);
            }
            const [startHour, startMin] = slot.startTime.split(':').map(Number);
            const [endHour, endMin] = slot.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            if (startMinutes >= endMinutes) {
                  throw new Error(`Time slot ${i + 1}: Start time must be before end time`);
            }
      }
      return true;
};

/**
 * Custom validator: Validate recurrence configuration based on type
 */
const validateRecurrenceConfig = (value: any): boolean => {
      if (!value || !value.type) {
            throw new Error('Recurrence type is required');
      }

      if (!RECURRENCE_TYPES.includes(value.type)) {
            throw new Error(`Invalid recurrence type. Must be one of: ${RECURRENCE_TYPES.join(', ')}`);
      }

      if (!value.startDate) {
            throw new Error('Recurrence start date is required');
      }

      const startDate = new Date(value.startDate);
      if (isNaN(startDate.getTime())) {
            throw new Error('Invalid recurrence start date');
      }

      if (value.endDate) {
            const endDate = new Date(value.endDate);
            if (isNaN(endDate.getTime())) {
                  throw new Error('Invalid recurrence end date');
            }
            if (endDate <= startDate) {
                  throw new Error('Recurrence end date must be after start date');
            }
      }

      switch (value.type) {
            case 'daily':
                  if (!value.dailyTimeSlots || !Array.isArray(value.dailyTimeSlots) || value.dailyTimeSlots.length === 0) {
                        throw new Error('Daily recurrence requires a single set of dailyTimeSlots for every day');
                  }
                  validateTimeSlots(value.dailyTimeSlots);
                  break;

            case 'weekly':
                  if (!value.dayWiseTimeSlots || !Array.isArray(value.dayWiseTimeSlots) || value.dayWiseTimeSlots.length === 0) {
                        throw new Error('Weekly recurrence requires dayWiseTimeSlots with specific slots for each day');
                  }
                  for (const detail of value.dayWiseTimeSlots) {
                        if (!VALID_DAYS.includes(detail.day?.toLowerCase())) {
                              throw new Error(`Invalid day: ${detail.day}. Must be one of: ${VALID_DAYS.join(', ')}`);
                        }
                        validateTimeSlots(detail.timeSlots);
                  }
                  break;

            case 'monthly':
                  // Support new format: monthlyDayWiseSlots
                  if (value.monthlyDayWiseSlots && Array.isArray(value.monthlyDayWiseSlots) && value.monthlyDayWiseSlots.length > 0) {
                        for (const daySlot of value.monthlyDayWiseSlots) {
                              if (typeof daySlot.day !== 'number' || daySlot.day < 1 || daySlot.day > 31) {
                                    throw new Error(`Invalid day of month: ${daySlot.day}. Must be between 1 and 31`);
                              }
                              if (!daySlot.timeSlots || !Array.isArray(daySlot.timeSlots) || daySlot.timeSlots.length === 0) {
                                    throw new Error(`Day ${daySlot.day}: At least one time slot is required`);
                              }
                              validateTimeSlots(daySlot.timeSlots);
                        }
                  } else {
                        // Fallback to legacy format: monthlyDays with monthlyTimeSlots
                        if (!value.monthlyDays || !Array.isArray(value.monthlyDays) || value.monthlyDays.length === 0) {
                              throw new Error('Monthly recurrence requires either monthlyDayWiseSlots or monthlyDays');
                        }
                        for (const day of value.monthlyDays) {
                              if (typeof day !== 'number' || day < 1 || day > 31) {
                                    throw new Error(`Invalid day of month: ${day}. Must be between 1 and 31`);
                              }
                        }
                        if (!value.monthlyTimeSlots || !Array.isArray(value.monthlyTimeSlots) || value.monthlyTimeSlots.length === 0) {
                              throw new Error('Monthly recurrence requires monthlyTimeSlots that apply to all selected days');
                        }
                        validateTimeSlots(value.monthlyTimeSlots);
                  }
                  break;

            case 'yearly':
                  if (value.yearlyMonth === undefined || value.yearlyMonth < 0 || value.yearlyMonth > 11) {
                        throw new Error('Yearly recurrence requires a valid month (0-11)');
                  }
                  if (value.yearlyDay === undefined || value.yearlyDay < 1 || value.yearlyDay > 31) {
                        throw new Error('Yearly recurrence requires a valid day (1-31)');
                  }
                  if (!value.yearlyTimeSlots || !Array.isArray(value.yearlyTimeSlots) || value.yearlyTimeSlots.length === 0) {
                        throw new Error('Yearly recurrence requires at least one time slot');
                  }
                  validateTimeSlots(value.yearlyTimeSlots);
                  break;

            case 'custom':
                  if (!value.dayWiseTimeSlots || !Array.isArray(value.dayWiseTimeSlots) || value.dayWiseTimeSlots.length === 0) {
                        throw new Error('Custom recurrence requires dayWiseTimeSlots with specific slots for each day');
                  }
                  for (const detail of value.dayWiseTimeSlots) {
                        if (!VALID_DAYS.includes(detail.day?.toLowerCase())) {
                              throw new Error(`Invalid day: ${detail.day}. Must be one of: ${VALID_DAYS.join(', ')}`);
                        }
                        validateTimeSlots(detail.timeSlots);
                  }
                  if (value.customInterval !== undefined) {
                        if (typeof value.customInterval !== 'number' || value.customInterval < 1 || value.customInterval > 52) {
                              throw new Error('Custom interval must be between 1 and 52 weeks');
                        }
                  }
                  break;

            case 'none':
                  break;
      }

      return true;
};

/**
 * Validate Create Class Request
 */
export const validateCreateClass = [
      body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required')
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),

      body('description')
            .optional()
            .trim()
            .isLength({ max: 2000 })
            .withMessage('Description must be at most 2000 characters'),

      body('instructor')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Instructor name must be at most 100 characters'),

      body('location')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Location must be at most 200 characters'),

      body('capacity')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Capacity must be between 1 and 1000'),

      body('availability')
            .optional()
            .isBoolean()
            .withMessage('availability must be a boolean'),

      body('isRecurring')
            .isBoolean()
            .withMessage('isRecurring must be a boolean'),

      // One-time class validation
      body('scheduledDate')
            .if((_value: any, { req }: any) => req.body.isRecurring === false || req.body.isRecurring === 'false')
            .notEmpty()
            .withMessage('Scheduled date is required for one-time classes')
            .isISO8601()
            .withMessage('Invalid scheduled date format'),

      body('startTime')
            .if((_value: any, { req }: any) => req.body.isRecurring === false || req.body.isRecurring === 'false')
            .notEmpty()
            .withMessage('Start time is required for one-time classes')
            .matches(TIME_FORMAT)
            .withMessage('Start time must be in HH:mm format'),

      body('endTime')
            .if((_value: any, { req }: any) => req.body.isRecurring === false || req.body.isRecurring === 'false')
            .notEmpty()
            .withMessage('End time is required for one-time classes')
            .matches(TIME_FORMAT)
            .withMessage('End time must be in HH:mm format')
            .custom((value, { req }) => {
                  if (req.body.startTime && value) {
                        const [startH, startM] = req.body.startTime.split(':').map(Number);
                        const [endH, endM] = value.split(':').map(Number);
                        if (startH * 60 + startM >= endH * 60 + endM) {
                              throw new Error('End time must be after start time');
                        }
                  }
                  return true;
            }),

      // Recurring class validation
      body('recurrence')
            .if((_value: any, { req }: any) => req.body.isRecurring === true || req.body.isRecurring === 'true')
            .notEmpty()
            .withMessage('Recurrence configuration is required for recurring classes')
            .custom(validateRecurrenceConfig),

      handleValidationErrors,
];

/**
 * Validate Update Class Request
 */
export const validateUpdateClass = [
      param('id')
            .isMongoId()
            .withMessage('Invalid class ID'),

      body('title')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),

      body('description')
            .optional()
            .trim()
            .isLength({ max: 2000 })
            .withMessage('Description must be at most 2000 characters'),

      body('instructor')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Instructor name must be at most 100 characters'),

      body('location')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Location must be at most 200 characters'),

      body('capacity')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Capacity must be between 1 and 1000'),

      body('availability')
            .optional()
            .isBoolean()
            .withMessage('availability must be a boolean'),

      body('status')
            .optional()
            .isIn(['active', 'cancelled', 'completed'])
            .withMessage('Status must be active, cancelled, or completed'),

      handleValidationErrors,
];

/**
 * Validate Class ID parameter
 */
export const validateClassId = [
      param('id')
            .isMongoId()
            .withMessage('Invalid class ID'),
      handleValidationErrors,
];

/**
 * Validate Get Classes Query
 */
export const validateGetClasses = [
      query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid start date format'),

      query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid end date format'),

      query('status')
            .optional()
            .isIn(['active', 'cancelled', 'completed'])
            .withMessage('Status must be active, cancelled, or completed'),

      query('isRecurring')
            .optional()
            .isBoolean()
            .withMessage('isRecurring must be a boolean'),

      query('availability')
            .optional()
            .isBoolean()
            .withMessage('availability must be a boolean'),

      query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search query must be between 1 and 100 characters'),

      query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

      query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),

      handleValidationErrors,
];

/**
 * Validate Get Class Instances Query
 */
export const validateGetInstances = [
      query('startDate')
            .notEmpty()
            .withMessage('Start date is required')
            .isISO8601()
            .withMessage('Invalid start date format'),

      query('endDate')
            .notEmpty()
            .withMessage('End date is required')
            .isISO8601()
            .withMessage('Invalid end date format')
            .custom((value, { req }) => {
                  const startDate = new Date(req.query?.startDate as string);
                  const endDate = new Date(value);
                  if (endDate <= startDate) {
                        throw new Error('End date must be after start date');
                  }
                  return true;
            }),

      query('status')
            .optional()
            .isIn(['scheduled', 'cancelled', 'completed'])
            .withMessage('Status must be scheduled, cancelled, or completed'),

      handleValidationErrors,
];

/**
 * Validate Update Instance Status
 */
export const validateUpdateInstanceStatus = [
      param('instanceId')
            .isMongoId()
            .withMessage('Invalid instance ID'),

      body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['scheduled', 'cancelled', 'completed'])
            .withMessage('Status must be scheduled, cancelled, or completed'),

      handleValidationErrors,
];

/**
 * Validate Update Class Status
 */
export const validateUpdateClassStatus = [
      param('id')
            .isMongoId()
            .withMessage('Invalid class ID'),

      body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['active', 'cancelled', 'completed'])
            .withMessage('Status must be active, cancelled, or completed'),

      handleValidationErrors,
];
