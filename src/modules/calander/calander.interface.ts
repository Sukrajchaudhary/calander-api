import { Document, Types } from 'mongoose';

// Time slot for scheduling
export interface ITimeSlot {
      startTime: string; // HH:mm format (e.g., "09:00")
      endTime: string;   // HH:mm format (e.g., "10:00")
}

// Recurrence pattern types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

// Days of the week
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Day-wise time slots mapping
export interface IDayWiseTimeSlot {
      day: DayOfWeek;
      timeSlots: ITimeSlot[];
}

// Monthly day-wise time slots (day of month with specific time slots)
export interface IMonthlyDayWiseSlot {
      day: number; // Day of month (1-31)
      timeSlots: ITimeSlot[];
}

// Recurrence configuration
export interface IRecurrenceConfig {
      type: RecurrenceType;

      // New flexible format: Map days to multiple time slots
      dayWiseTimeSlots?: IDayWiseTimeSlot[];

      // For daily recurrence (legacy/simple)
      dailyTimeSlots?: ITimeSlot[];

      // For weekly recurrence (legacy)
      weeklyDays?: DayOfWeek[];
      weeklyTimeSlots?: ITimeSlot[];

      // For monthly recurrence (legacy - single time slot for all days)
      monthlyDays?: number[]; // Days of month (1-31)
      monthlyTimeSlots?: ITimeSlot[];

      // For monthly recurrence (new - day-specific time slots)
      monthlyDayWiseSlots?: IMonthlyDayWiseSlot[];

      // For yearly recurrence
      yearlyMonth?: number; // 0-11
      yearlyDay?: number;   // 1-31
      yearlyTimeSlots?: ITimeSlot[];

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
      availability?: boolean; // New field

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
      availability?: boolean;
      search?: string; // Search by title or instructor
      page?: number;
      limit?: number;
}
