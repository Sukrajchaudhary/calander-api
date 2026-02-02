import { ICalanderEvent } from "./calander.interface";
import CalanderEvent from "./calander.model";
import {
      NotFoundError,
      InternalServerError,
} from "../../errors/AppError";

class CalanderService {
      async getAllEvents(
            startDate?: Date,
            endDate?: Date,
            status?: string
      ): Promise<ICalanderEvent[]> {
            try {
                  let query: any = {};

                  if (status) {
                        query.status = status;
                  }

                  if (startDate && endDate) {
                        query.startDate = { $gte: startDate, $lte: endDate };
                  } else if (startDate) {
                        query.startDate = { $gte: startDate };
                  } else if (endDate) {
                        query.startDate = { $lte: endDate };
                  }

                  const events = await CalanderEvent.find(query)
                        .sort({ startDate: 1 })
                        .lean();

                  return events;
            } catch (error: any) {
                  throw new InternalServerError(
                        `Failed to retrieve events: ${error.message}`
                  );
            }
      }

      async getEventById(id: string): Promise<ICalanderEvent> {
            try {
                  const event = await CalanderEvent.findById(id).lean();
                  if (!event) {
                        throw new NotFoundError("Event");
                  }
                  return event;
            } catch (error: any) {
                  if (error instanceof NotFoundError) throw error;
                  throw new InternalServerError(
                        `Failed to retrieve event: ${error.message}`
                  );
            }
      }

      async createEvent(eventData: Partial<ICalanderEvent>): Promise<ICalanderEvent> {
            try {
                  const newEvent = new CalanderEvent(eventData);
                  await newEvent.save();
                  return newEvent.toObject();
            } catch (error: any) {
                  throw new InternalServerError(`Failed to create event: ${error.message}`);
            }
      }

      async updateEvent(id: string, updateData: Partial<ICalanderEvent>): Promise<ICalanderEvent> {
            try {
                  const updatedEvent = await CalanderEvent.findByIdAndUpdate(id, updateData, {
                        new: true,
                        runValidators: true,
                  }).lean();

                  if (!updatedEvent) {
                        throw new NotFoundError("Event");
                  }

                  return updatedEvent;
            } catch (error: any) {
                  if (error instanceof NotFoundError) throw error;
                  throw new InternalServerError(`Failed to update event: ${error.message}`);
            }
      }

      async deleteEvent(id: string): Promise<void> {
            try {
                  const event = await CalanderEvent.findByIdAndDelete(id);
                  if (!event) {
                        throw new NotFoundError("Event");
                  }
            } catch (error: any) {
                  if (error instanceof NotFoundError) throw error;
                  throw new InternalServerError(`Failed to delete event: ${error.message}`);
            }
      }
}

export default new CalanderService();
