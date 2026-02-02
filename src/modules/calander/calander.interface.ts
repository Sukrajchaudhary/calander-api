import { Document } from 'mongoose';

export interface ICalanderEvent extends Document {
      title: string;
      description?: string;
      startDate: Date;
      endDate: Date;
      location?: string;
      isAllDay: boolean;
      status: 'draft' | 'published' | 'cancelled';
      createdAt: Date;
      updatedAt: Date;
}
