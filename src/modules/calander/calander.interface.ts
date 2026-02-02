import { Document, Types } from 'mongoose';

// Time slot for scheduling
export interface ITimeSlot {
      startTime: string; // HH:mm format (e.g., "09:00")
      endTime: string;   // HH:mm format (e.g., "10:00")
}

// Recurrence pattern types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

// Days of the week
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Recurrence configuration
export interface IRecurrenceConfig {
      type: RecurrenceType;

      // For daily recurrence
      dailyTimeSlots?: ITimeSlot[];

      // For weekly recurrence
      weeklyDays?: DayOfWeek[];
      weeklyTimeSlots?: ITimeSlot[];

      // For monthly recurrence
      monthlyDays?: number[]; // Days of month (1-31)
      monthlyTimeSlots?: ITimeSlot[];

      // For custom recurrence
      customDays?: DayOfWeek[];
      customInterval?: number; // Every X weeks
      customTimeSlots?: ITimeSlot[];

      // Common fields
      startDate: Date;
      endDate?: Date; // Optional end date for recurrence
      occurrences?: number; // Optional max occurrences
}

// Main class interface
export interface IClass extends Document {
      _id: Types.ObjectId;
      title: string;
      description?: string;
      instructor?: string;
      location?: string;
      capacity?: number;

      // Scheduling
      isRecurring: boolean;

      // For one-time classes
      scheduledDate?: Date;
      startTime?: string;
      endTime?: string;

      // For recurring classes
      recurrence?: IRecurrenceConfig;

      // Status
      status: 'active' | 'cancelled' | 'completed';

      // Metadata
      createdAt: Date;
      updatedAt: Date;
}

// Class instance (generated from recurring classes)
export interface IClassInstance extends Document {
      _id: Types.ObjectId;
      classId: Types.ObjectId;
      scheduledDate: Date;
      startTime: string;
      endTime: string;
      status: 'scheduled' | 'cancelled' | 'completed';
      createdAt: Date;
      updatedAt: Date;
}

// Pagination interface
export interface IPagination {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
}

// API Response interfaces
export interface ISuccessResponse<T> {
      title: string;
      message: string;
      data: T;
      pagination?: IPagination;
}

export interface IErrorDetail {
      field: string;
      message: string;
}

export interface IErrorResponse {
      title: string;
      message: string;
      errors?: IErrorDetail[];
}

// Query filters
export interface IClassQueryFilters {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      isRecurring?: boolean;
      page?: number;
      limit?: number;
}
