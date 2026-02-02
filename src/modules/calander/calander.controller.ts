import { Request, Response, NextFunction } from "express";
import CalanderService from "./calander.service";
import { asyncHandler } from "../../global/errorHandler";


class CalanderController {
      getAllEvents = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction) => {
                  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
                  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
                  const status = req.query.status as string | undefined;

                  const events = await CalanderService.getAllEvents(startDate, endDate, status);

                  res.status(200).json({
                        success: true,
                        message: "Events retrieved successfully",
                        data: events,
                  });
            }
      );

      getEventById = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction) => {
                  const { id } = req.params;
                  const event = await CalanderService.getEventById(id);

                  res.status(200).json({
                        success: true,
                        message: "Event retrieved successfully",
                        data: event,
                  });
            }
      );

      createEvent = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction) => {
                  const newEvent = await CalanderService.createEvent(req.body);

                  res.status(201).json({
                        success: true,
                        message: "Event created successfully",
                        data: newEvent,
                  });
            }
      );

      updateEvent = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction) => {
                  const { id } = req.params;
                  const updatedEvent = await CalanderService.updateEvent(id, req.body);

                  res.status(200).json({
                        success: true,
                        message: "Event updated successfully",
                        data: updatedEvent,
                  });
            }
      );

      deleteEvent = asyncHandler(
            async (req: Request, res: Response, _next: NextFunction) => {
                  const { id } = req.params;
                  await CalanderService.deleteEvent(id);

                  res.status(200).json({
                        success: true,
                        message: "Event deleted successfully",
                  });
            }
      );
}

export default new CalanderController();
