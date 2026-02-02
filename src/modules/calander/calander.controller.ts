import { Request, Response, NextFunction } from 'express';
import CalanderService from './calander.service';
import { asyncHandler } from '../../global/errorHandler';
import {
      ISuccessResponse,
      IErrorResponse,
      IClass,
      IClassInstance,
      IClassQueryFilters,
} from './calander.interface';

class CalanderController {
      /**
       * Create a new class
       * POST /api/v1/calander
       */
      createClass = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const result = await CalanderService.createClass(req.body);

                  const response: ISuccessResponse<{
                        class: IClass;
                        instances?: IClassInstance[];
                        instanceCount?: number;
                  }> = {
                        title: 'Class Created',
                        message: result.instances
                              ? `Class created successfully with ${result.instances.length} scheduled instances`
                              : 'Class created successfully',
                        data: {
                              class: result.class,
                              instances: result.instances?.slice(0, 10),
                              instanceCount: result.instances?.length,
                        },
                  };

                  res.status(201).json(response);
            }
      );

      /**
       * Get all classes with pagination
       * GET /api/v1/calander
       */
      getAllClasses = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const filters: IClassQueryFilters = {
                        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                        status: req.query.status as string | undefined,
                        isRecurring: req.query.isRecurring !== undefined
                              ? req.query.isRecurring === 'true'
                              : undefined,
                        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
                        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
                  };

                  const result = await CalanderService.getAllClasses(filters);

                  const response: ISuccessResponse<IClass[]> = {
                        title: 'Classes Fetched',
                        message: 'Class list loaded successfully',
                        data: result.classes,
                        pagination: result.pagination,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Get a single class by ID
       * GET /api/v1/calander/:id
       */
      getClassById = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { id } = req.params;
                  const classDoc = await CalanderService.getClassById(id);

                  if (!classDoc) {
                        const errorResponse: IErrorResponse = {
                              title: 'Not Found',
                              message: 'Class not found',
                        };
                        res.status(404).json(errorResponse);
                        return;
                  }

                  const response: ISuccessResponse<IClass> = {
                        title: 'Class Fetched',
                        message: 'Class retrieved successfully',
                        data: classDoc,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Update a class
       * PUT /api/v1/calander/:id
       */
      updateClass = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { id } = req.params;
                  const updatedClass = await CalanderService.updateClass(id, req.body);

                  if (!updatedClass) {
                        const errorResponse: IErrorResponse = {
                              title: 'Not Found',
                              message: 'Class not found',
                        };
                        res.status(404).json(errorResponse);
                        return;
                  }

                  const response: ISuccessResponse<IClass> = {
                        title: 'Class Updated',
                        message: 'Class updated successfully',
                        data: updatedClass,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Delete a class
       * DELETE /api/v1/calander/:id
       */
      deleteClass = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { id } = req.params;
                  const deleted = await CalanderService.deleteClass(id);

                  if (!deleted) {
                        const errorResponse: IErrorResponse = {
                              title: 'Not Found',
                              message: 'Class not found',
                        };
                        res.status(404).json(errorResponse);
                        return;
                  }

                  const response: ISuccessResponse<null> = {
                        title: 'Class Deleted',
                        message: 'Class and associated instances deleted successfully',
                        data: null,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Get class instances within a date range
       * GET /api/v1/calander/instances
       */
      getClassInstances = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const startDate = new Date(req.query.startDate as string);
                  const endDate = new Date(req.query.endDate as string);
                  const status = req.query.status as string | undefined;

                  const instances = await CalanderService.getClassInstances(startDate, endDate, status);

                  const response: ISuccessResponse<IClassInstance[]> = {
                        title: 'Instances Fetched',
                        message: 'Class instances retrieved successfully',
                        data: instances,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Get instances for a specific class
       * GET /api/v1/calander/:id/instances
       */
      getInstancesByClassId = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { id } = req.params;
                  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
                  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

                  const result = await CalanderService.getInstancesByClassId(id, page, limit);

                  const response: ISuccessResponse<IClassInstance[]> = {
                        title: 'Class Instances Fetched',
                        message: 'Class instances retrieved successfully',
                        data: result.instances,
                        pagination: result.pagination,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Update a specific instance status
       * PATCH /api/v1/calander/instances/:instanceId
       */
      updateInstanceStatus = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { instanceId } = req.params;
                  const { status } = req.body;

                  const updatedInstance = await CalanderService.updateInstanceStatus(instanceId, status);

                  if (!updatedInstance) {
                        const errorResponse: IErrorResponse = {
                              title: 'Not Found',
                              message: 'Instance not found',
                        };
                        res.status(404).json(errorResponse);
                        return;
                  }

                  const response: ISuccessResponse<{
                        instance: IClassInstance & { classId?: any };
                        class?: any;
                  }> = {
                        title: 'Instance Updated',
                        message: 'Instance status updated successfully',
                        data: {
                              instance: updatedInstance,
                              class: updatedInstance.classId,
                        },
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Get calendar view
       * GET /api/v1/calander/calendar
       */
      getCalendarView = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const startDate = new Date(req.query.startDate as string);
                  const endDate = new Date(req.query.endDate as string);

                  const events = await CalanderService.getCalendarView(startDate, endDate);

                  const response: ISuccessResponse<any[]> = {
                        title: 'Calendar View',
                        message: 'Calendar events retrieved successfully',
                        data: events,
                  };

                  res.status(200).json(response);
            }
      );

      /**
       * Regenerate instances for a recurring class
       * POST /api/v1/calander/:id/regenerate
       */
      regenerateInstances = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
                  const { id } = req.params;

                  const classDoc = await CalanderService.getClassById(id);
                  if (!classDoc) {
                        const errorResponse: IErrorResponse = {
                              title: 'Not Found',
                              message: 'Class not found',
                        };
                        res.status(404).json(errorResponse);
                        return;
                  }

                  if (!classDoc.isRecurring) {
                        const errorResponse: IErrorResponse = {
                              title: 'Invalid Operation',
                              message: 'Cannot regenerate instances for non-recurring classes',
                        };
                        res.status(400).json(errorResponse);
                        return;
                  }

                  const instances = await CalanderService.regenerateInstances(id);

                  const response: ISuccessResponse<{
                        instanceCount: number;
                        instances: IClassInstance[];
                  }> = {
                        title: 'Instances Regenerated',
                        message: `${instances.length} instances regenerated successfully`,
                        data: {
                              instanceCount: instances.length,
                              instances: instances.slice(0, 10),
                        },
                  };

                  res.status(200).json(response);
            }
      );
}

export default new CalanderController();
