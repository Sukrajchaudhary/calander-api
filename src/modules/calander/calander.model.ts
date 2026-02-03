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

// Day Wise Time Slot Schema
const DayWiseTimeSlotSchema = new Schema({
      day: {
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            required: true,
      },
      timeSlots: [TimeSlotSchema],
}, { _id: false });

// Monthly Day Wise Slot Schema (for month day-specific time slots)
const MonthlyDayWiseSlotSchema = new Schema({
      day: {
            type: Number,
            min: 1,
            max: 31,
            required: true,
      },
      timeSlots: [TimeSlotSchema],
}, { _id: false });

// Recurrence Config Schema (embedded)
const RecurrenceConfigSchema = new Schema({
      type: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
            required: true,
      },
      dayWiseTimeSlots: [DayWiseTimeSlotSchema],
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
      monthlyDayWiseSlots: [MonthlyDayWiseSlotSchema],
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
      yearlyMonth: {
            type: Number,
            min: 0,
            max: 11,
      },
      yearlyDay: {
            type: Number,
            min: 1,
            max: 31,
      },
      yearlyTimeSlots: [TimeSlotSchema],

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
            availability: {
                  type: Boolean,
                  default: true,
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
ClassSchema.index({ availability: 1 });
// Text index for search
ClassSchema.index({ title: 'text', instructor: 'text' });

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
