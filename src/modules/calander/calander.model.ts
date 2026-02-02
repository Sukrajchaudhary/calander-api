import mongoose, { Schema } from 'mongoose';
import { IClass, IClassInstance } from './calander.interface';

// Time Slot Schema (embedded)
const TimeSlotSchema = new Schema({
      startTime: {
            type: String,
            required: true,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      endTime: {
            type: String,
            required: true,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
}, { _id: false });

// Recurrence Config Schema (embedded)
const RecurrenceConfigSchema = new Schema({
      type: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly', 'custom'],
            required: true,
      },
      dailyTimeSlots: [TimeSlotSchema],
      weeklyDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
      weeklyTimeSlots: [TimeSlotSchema],
      monthlyDays: [{
            type: Number,
            min: 1,
            max: 31,
      }],
      monthlyTimeSlots: [TimeSlotSchema],
      customDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
      customInterval: {
            type: Number,
            min: 1,
            max: 52,
      },
      customTimeSlots: [TimeSlotSchema],
      startDate: {
            type: Date,
            required: true,
      },
      endDate: {
            type: Date,
      },
      occurrences: {
            type: Number,
            min: 1,
      },
}, { _id: false });

// Main Class Schema
const ClassSchema = new Schema<IClass>(
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
                  maxlength: 2000,
            },
            instructor: {
                  type: String,
                  trim: true,
                  maxlength: 100,
            },
            location: {
                  type: String,
                  trim: true,
                  maxlength: 200,
            },
            capacity: {
                  type: Number,
                  min: 1,
                  max: 1000,
            },
            isRecurring: {
                  type: Boolean,
                  default: false,
            },
            scheduledDate: {
                  type: Date,
            },
            startTime: {
                  type: String,
                  match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            },
            endTime: {
                  type: String,
                  match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            },
            recurrence: RecurrenceConfigSchema,
            status: {
                  type: String,
                  enum: ['active', 'cancelled', 'completed'],
                  default: 'active',
                  index: true,
            },
      },
      {
            timestamps: true,
            versionKey: false,
      }
);

// Indexes for efficient querying
ClassSchema.index({ scheduledDate: 1 });
ClassSchema.index({ 'recurrence.startDate': 1, 'recurrence.endDate': 1 });
ClassSchema.index({ isRecurring: 1, status: 1 });

// Class Instance Schema (for generated recurring instances)
const ClassInstanceSchema = new Schema<IClassInstance>(
      {
            classId: {
                  type: Schema.Types.ObjectId,
                  ref: 'Class',
                  required: true,
                  index: true,
            },
            scheduledDate: {
                  type: Date,
                  required: true,
                  index: true,
            },
            startTime: {
                  type: String,
                  required: true,
                  match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            },
            endTime: {
                  type: String,
                  required: true,
                  match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            },
            status: {
                  type: String,
                  enum: ['scheduled', 'cancelled', 'completed'],
                  default: 'scheduled',
                  index: true,
            },
      },
      {
            timestamps: true,
            versionKey: false,
      }
);

// Compound index for date range queries
ClassInstanceSchema.index({ scheduledDate: 1, status: 1 });
ClassInstanceSchema.index({ classId: 1, scheduledDate: 1 });

export const Class = mongoose.model<IClass>('Class', ClassSchema);
export const ClassInstance = mongoose.model<IClassInstance>('ClassInstance', ClassInstanceSchema);

export default Class;
