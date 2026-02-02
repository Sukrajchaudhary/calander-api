import mongoose, { Schema } from 'mongoose';
import { ICalanderEvent } from './calander.interface';

const CalanderEventSchema: Schema = new Schema(
      {
            title: {
                  type: String,
                  required: true,
                  trim: true,
                  maxlength: 200,
            },
            description: {
                  type: String,
                  trim: true,
            },
            startDate: {
                  type: Date,
                  required: true,
                  index: true,
            },
            endDate: {
                  type: Date,
                  required: true,
            },
            location: {
                  type: String,
                  trim: true,
            },
            isAllDay: {
                  type: Boolean,
                  default: false,
            },
            status: {
                  type: String,
                  enum: ['draft', 'published', 'cancelled'],
                  default: 'draft',
                  index: true,
            },
      },
      {
            timestamps: true,
            versionKey: false,
      }
);

// Index for getting events within a range
CalanderEventSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model<ICalanderEvent>('CalanderEvent', CalanderEventSchema);
