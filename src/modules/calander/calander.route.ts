import { Router } from 'express';
import CalanderController from './calander.controller';
import {
      validateCreateClass,
      validateUpdateClass,
      validateClassId,
      validateGetClasses,
      validateGetInstances,
      validateUpdateInstanceStatus,
} from './calander.validator';

const router: Router = Router();

// =====================================================
// CLASS ROUTES
// =====================================================

/**
 * @route   GET /api/v1/calander
 * @desc    Get all classes with pagination and filters
 * @access  Public
 */
router.get('/', validateGetClasses, CalanderController.getAllClasses);

/**
 * @route   POST /api/v1/calander
 * @desc    Create a new class (one-time or recurring)
 * @access  Public
 */
router.post('/', validateCreateClass, CalanderController.createClass);

/**
 * @route   GET /api/v1/calander/calendar
 * @desc    Get calendar view with all events in date range
 * @access  Public
 */
router.get('/calendar', validateGetInstances, CalanderController.getCalendarView);

/**
 * @route   GET /api/v1/calander/instances
 * @desc    Get all class instances within a date range
 * @access  Public
 */
router.get('/instances', validateGetInstances, CalanderController.getClassInstances);

/**
 * @route   PATCH /api/v1/calander/instances/:instanceId
 * @desc    Update a specific instance status
 * @access  Public
 */
router.patch(
      '/instances/:instanceId',
      validateUpdateInstanceStatus,
      CalanderController.updateInstanceStatus
);

/**
 * @route   GET /api/v1/calander/:id
 * @desc    Get a single class by ID
 * @access  Public
 */
router.get('/:id', validateClassId, CalanderController.getClassById);

/**
 * @route   PUT /api/v1/calander/:id
 * @desc    Update a class
 * @access  Public
 */
router.put('/:id', validateUpdateClass, CalanderController.updateClass);

/**
 * @route   DELETE /api/v1/calander/:id
 * @desc    Delete a class and its instances
 * @access  Public
 */
router.delete('/:id', validateClassId, CalanderController.deleteClass);

/**
 * @route   GET /api/v1/calander/:id/instances
 * @desc    Get all instances for a specific class
 * @access  Public
 */
router.get('/:id/instances', validateClassId, CalanderController.getInstancesByClassId);

/**
 * @route   POST /api/v1/calander/:id/regenerate
 * @desc    Regenerate instances for a recurring class
 * @access  Public
 */
router.post('/:id/regenerate', validateClassId, CalanderController.regenerateInstances);

export default router;
