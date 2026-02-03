import {
      IClass,
      IClassInstance,
      IRecurrenceConfig,
      ITimeSlot,
      DayOfWeek,
      IPagination,
      IClassQueryFilters,
} from './calander.interface';
import { Class, ClassInstance } from './calander.model';

// Day of week mapping
const DAY_MAP: Record<DayOfWeek, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
};

// Helper to normalize date to start of day (00:00:00.000) to avoid time mismatches
const normalizeDate = (date: Date | string): Date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
};

class CalanderService {
      /**
       * Generate class instances for a recurring class
       */
      private async generateInstances(
            classId: string,
            recurrence: IRecurrenceConfig,
            maxInstances: number = 365,
            save: boolean = true
      ): Promise<IClassInstance[] | Partial<IClassInstance>[]> {
            const instances: Partial<IClassInstance>[] = [];
            const startDate = normalizeDate(recurrence.startDate);
            const endDate = recurrence.endDate ? normalizeDate(recurrence.endDate) : null;
            const maxOccurrences = recurrence.occurrences || maxInstances;

            let currentDate = new Date(startDate);
            let occurrenceCount = 0;

            // Helper to add days
            const addDays = (date: Date, days: number): Date => {
                  const result = new Date(date);
                  result.setDate(result.getDate() + days);
                  return result;
            };

            // Helper to check if date is within bounds
            const isWithinBounds = (date: Date): boolean => {
                  if (occurrenceCount >= maxOccurrences) return false;
                  if (endDate && date > endDate) return false;
                  return true;
            };

            // Helper to get time slots for a specific day from dayWiseTimeSlots
            const getTimeSlotsForDate = (date: Date): ITimeSlot[] => {
                  const dayName = Object.keys(DAY_MAP).find(
                        key => DAY_MAP[key as DayOfWeek] === date.getDay()
                  ) as DayOfWeek;

                  if (recurrence.dayWiseTimeSlots && recurrence.dayWiseTimeSlots.length > 0) {
                        const dayConfig = recurrence.dayWiseTimeSlots.find(
                              d => d.day.toLowerCase() === dayName.toLowerCase()
                        );
                        return dayConfig ? dayConfig.timeSlots : [];
                  }
                  return [];
            };

            // Helper to create instance objects for a date with time slots
            const createInstancesForDate = (date: Date, timeSlots: ITimeSlot[]) => {
                  for (const slot of timeSlots) {
                        if (!isWithinBounds(date)) break;
                        instances.push({
                              classId: classId as any,
                              scheduledDate: new Date(date),
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                              status: slot.status || 'scheduled',
                        });
                        occurrenceCount++;
                  }
            };

            switch (recurrence.type) {
                  case 'daily': {
                        const slots = recurrence.dailyTimeSlots || [];
                        while (isWithinBounds(currentDate)) {
                              createInstancesForDate(currentDate, slots);
                              currentDate = addDays(currentDate, 1);
                        }
                        break;
                  }

                  case 'weekly': {
                        const targetDays = (recurrence.dayWiseTimeSlots || []).map(d => DAY_MAP[d.day.toLowerCase() as DayOfWeek]);
                        if (targetDays.length === 0) break;

                        while (isWithinBounds(currentDate)) {
                              if (targetDays.includes(currentDate.getDay())) {
                                    const slots = getTimeSlotsForDate(currentDate);
                                    if (slots.length > 0) {
                                          createInstancesForDate(currentDate, slots);
                                    }
                              }
                              currentDate = addDays(currentDate, 1);
                        }
                        break;
                  }

                  case 'monthly': {
                        // Support both legacy monthlyDays/monthlyTimeSlots and new monthlyDayWiseSlots
                        const monthlyDayWiseSlots = recurrence.monthlyDayWiseSlots || [];
                        const legacyMonthlyDays = recurrence.monthlyDays || [];
                        const legacySlots = recurrence.monthlyTimeSlots || [];

                        // Start from the first month
                        currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

                        while (isWithinBounds(currentDate)) {
                              // Handle new format: monthlyDayWiseSlots
                              if (monthlyDayWiseSlots.length > 0) {
                                    for (const daySlot of monthlyDayWiseSlots) {
                                          const dayOfMonth = daySlot.day;
                                          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);

                                          // Check if the day exists in this month
                                          if (targetDate.getMonth() !== currentDate.getMonth()) continue;

                                          // Skip if before start date
                                          if (targetDate < startDate) continue;
                                          if (!isWithinBounds(targetDate)) break;

                                          createInstancesForDate(targetDate, daySlot.timeSlots);
                                    }
                              } else if (legacyMonthlyDays.length > 0) {
                                    // Handle legacy format: monthlyDays with monthlyTimeSlots
                                    for (const dayOfMonth of legacyMonthlyDays) {
                                          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);

                                          // Check if the day exists in this month
                                          if (targetDate.getMonth() !== currentDate.getMonth()) continue;

                                          // Skip if before start date
                                          if (targetDate < startDate) continue;
                                          if (!isWithinBounds(targetDate)) break;

                                          createInstancesForDate(targetDate, legacySlots);
                                    }
                              }
                              // Move to next month
                              currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                        }
                        break;
                  }

                  case 'yearly': {
                        const month = recurrence.yearlyMonth || 0;
                        const day = recurrence.yearlyDay || 1;
                        const slots = recurrence.yearlyTimeSlots || [];

                        currentDate = new Date(startDate.getFullYear(), month, day);
                        if (currentDate < startDate) {
                              currentDate.setFullYear(currentDate.getFullYear() + 1);
                        }

                        while (isWithinBounds(currentDate)) {
                              createInstancesForDate(currentDate, slots);
                              // Move to next year
                              currentDate = new Date(currentDate.getFullYear() + 1, month, day);
                        }
                        break;
                  }

                  case 'custom': {
                        const interval = recurrence.customInterval || 1;
                        const targetDays = (recurrence.dayWiseTimeSlots || []).map(d => DAY_MAP[d.day.toLowerCase() as DayOfWeek]);
                        if (targetDays.length === 0) break;

                        let weekCount = 0;
                        let weekStart = new Date(startDate);
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

                        while (isWithinBounds(currentDate)) {
                              // Check if this is an active week based on interval
                              if (weekCount % interval === 0) {
                                    for (let i = 0; i < 7; i++) {
                                          const checkDate = addDays(weekStart, i);
                                          if (checkDate < startDate) continue;
                                          if (!isWithinBounds(checkDate)) break;

                                          if (targetDays.includes(checkDate.getDay())) {
                                                const slots = getTimeSlotsForDate(checkDate);
                                                if (slots.length > 0) {
                                                      createInstancesForDate(checkDate, slots);
                                                }
                                          }
                                    }
                              }

                              // Move to next week
                              weekStart = addDays(weekStart, 7);
                              currentDate = weekStart;
                              weekCount++;
                        }
                        break;
                  }
            }

            // Bulk insert instances if any were generated and save is true
            if (instances.length > 0 && save) {
                  const savedInstances = await ClassInstance.insertMany(instances);
                  return savedInstances as unknown as IClassInstance[];
            }

            if (instances.length > 0 && !save) {
                  return instances;
            }

            return [];
      }

      /**
       * Create a new class
       */
      async createClass(classData: Partial<IClass>): Promise<{ class: IClass; instances?: IClassInstance[] }> {
            const newClass = new Class(classData);
            await newClass.save();

            let instances: IClassInstance[] | undefined;

            // Generate instances for recurring classes
            if (classData.isRecurring && classData.recurrence) {
                  instances = await this.generateInstances(
                        newClass._id.toString(),
                        classData.recurrence,
                        365,
                        true
                  ) as IClassInstance[];
            }

            return {
                  class: newClass.toObject(),
                  instances,
            };
      }

      /**
       * Get all classes with pagination
       */
      async getAllClasses(filters: IClassQueryFilters): Promise<{
            classes: IClass[];
            pagination: IPagination;
      }> {
            const { startDate, endDate, status, isRecurring, availability, search, page = 1, limit = 10 } = filters;
            const skip = (page - 1) * limit;

            // Ensure endDate encompasses the entire day
            const adjustedEndDate = endDate ? new Date(endDate) : undefined;
            if (adjustedEndDate) {
                  adjustedEndDate.setHours(23, 59, 59, 999);
            }

            const query: any = {};

            if (status) {
                  query.status = status;
            }

            if (isRecurring !== undefined) {
                  query.isRecurring = isRecurring;
            }

            if (availability !== undefined) {
                  query.availability = availability;
            }

            // Search by title or instructor (case-insensitive partial match)
            if (search) {
                  const searchRegex = new RegExp(search, 'i');
                  query.$or = [
                        { title: searchRegex },
                        { instructor: searchRegex },
                  ];
            }

            // Date range filter (applied with $and if search is present)
            if (startDate && endDate) {
                  const dateQuery = {
                        $or: [
                              // One-time classes within date range
                              {
                                    isRecurring: false,
                                    scheduledDate: { $gte: startDate, $lte: adjustedEndDate },
                              },
                              // Recurring classes that overlap with date range
                              {
                                    isRecurring: true,
                                    'recurrence.startDate': { $lte: adjustedEndDate },
                                    $or: [
                                          { 'recurrence.endDate': { $gte: startDate } },
                                          { 'recurrence.endDate': { $exists: false } },
                                    ],
                              },
                        ],
                  };

                  // If there's already an $or from search, use $and to combine them
                  if (query.$or) {
                        query.$and = [
                              { $or: query.$or },
                              dateQuery,
                        ];
                        delete query.$or;
                  } else {
                        query.$or = dateQuery.$or;
                  }
            }

            const [total, classes] = await Promise.all([
                  Class.countDocuments(query),
                  Class.find(query)
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
            ]);

            return {
                  classes,
                  pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                  },
            };
      }

      /**
       * Get a single class by ID
       */
      async getClassById(id: string): Promise<IClass | null> {
            return Class.findById(id).lean();
      }

      /**
       * Update a class
       */
      async updateClass(id: string, updateData: Partial<IClass>): Promise<{ class: IClass; instances?: IClassInstance[] } | null> {
            const updatedClass = await Class.findByIdAndUpdate(
                  id,
                  { $set: updateData },
                  { new: true, runValidators: true }
            ).lean();

            if (!updatedClass) return null;

            let instances: IClassInstance[] | undefined;

            // If the class is recurring and recurrence-related fields are updated, regenerate instances
            if (
                  updatedClass.isRecurring &&
                  updatedClass.status === 'active' &&
                  (updateData.recurrence || updateData.isRecurring || updateData.startTime || updateData.endTime)
            ) {
                  instances = await this.regenerateInstances(id);
            }

            return {
                  class: updatedClass,
                  instances,
            };
      }

      /**
       * Update class status (active, cancelled, completed)
       */
      async updateClassStatus(
            id: string,
            status: 'active' | 'cancelled' | 'completed'
      ): Promise<IClass | null> {
            const updatedClass = await Class.findByIdAndUpdate(
                  id,
                  { status },
                  { new: true }
            ).lean();

            if (!updatedClass) return null;

            // If class is cancelled or completed, update all future scheduled instances
            if (status === 'cancelled' || status === 'completed') {
                  const instanceStatus = status === 'cancelled' ? 'cancelled' : 'completed';
                  const today = normalizeDate(new Date());
                  await ClassInstance.updateMany(
                        {
                              classId: id,
                              scheduledDate: { $gte: today },
                              status: 'scheduled',
                        },
                        { status: instanceStatus }
                  );
            }

            return updatedClass;
      }

      /**
       * Delete a class and its instances
       */
      async deleteClass(id: string): Promise<boolean> {
            const deletedClass = await Class.findByIdAndDelete(id);
            if (!deletedClass) return false;

            // Delete all instances associated with this class
            await ClassInstance.deleteMany({ classId: id });

            return true;
      }

      /**
       * Get class instances within a date range
       */
      async getClassInstances(
            startDate: Date,
            endDate: Date,
            status?: string
      ): Promise<IClassInstance[]> {
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setHours(23, 59, 59, 999);

            const query: any = {
                  scheduledDate: { $gte: startDate, $lte: adjustedEndDate },
            };

            if (status) {
                  query.status = status;
            }

            const instances = await ClassInstance.find(query)
                  .populate('classId', 'title description instructor location capacity')
                  .sort({ scheduledDate: 1, startTime: 1 })
                  .lean();

            return instances;
      }

      /**
       * Get instances for a specific class
       */
      async getInstancesByClassId(
            classId: string,
            page: number = 1,
            limit: number = 50
      ): Promise<{ instances: IClassInstance[]; pagination: IPagination }> {
            const skip = (page - 1) * limit;

            const [total, instances] = await Promise.all([
                  ClassInstance.countDocuments({ classId }),
                  ClassInstance.find({ classId })
                        .sort({ scheduledDate: 1, startTime: 1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
            ]);

            return {
                  instances,
                  pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                  },
            };
      }

      /**
       * Update a specific instance status
       */
      async updateInstanceStatus(
            instanceId: string,
            status: 'scheduled' | 'cancelled' | 'completed'
      ): Promise<(IClassInstance & { classId?: any }) | null> {
            return this.updateInstance(instanceId, { status });
      }

      /**
       * Update a specific class instance
       */
      async updateInstance(
            instanceId: string,
            updateData: Partial<IClassInstance>
      ): Promise<(IClassInstance & { classId?: any }) | null> {
            return ClassInstance.findByIdAndUpdate(
                  instanceId,
                  { $set: updateData },
                  { new: true, runValidators: true }
            )
                  .populate('classId', 'title description instructor location capacity status')
                  .lean();
      }

      /**
       * Update class instance by identifying details (ClassId + Date + StartTime)
       */
      async updateInstanceByDetails(
            classId: string,
            scheduledDate: string,
            startTime: string | undefined,
            updateData: Partial<IClassInstance>
      ): Promise<(IClassInstance & { classId?: any }) | null> {
            // Robust date query: cover the entire day, handling Local vs UTC mismatch
            // We parse manually to ensure we construct a Local Midnight date, matching how instances are generated
            const parts = scheduledDate.split('-');
            let startOfDay: Date, endOfDay: Date;

            if (parts.length === 3) {
                  // "YYYY-MM-DD" format - Construct Local Midnight
                  const year = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  startOfDay = new Date(year, month, day, 0, 0, 0, 0);
                  endOfDay = new Date(year, month, day, 23, 59, 59, 999);
            } else {
                  // Fallback for other formats (e.g. ISO string with time)
                  const targetDate = new Date(scheduledDate);
                  if (isNaN(targetDate.getTime())) return null;
                  startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
                  endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);
            }

            const query: any = {
                  classId,
                  scheduledDate: {
                        $gte: startOfDay,
                        $lte: endOfDay
                  },
            };

            if (startTime) {
                  query.startTime = startTime;
            }

            return ClassInstance.findOneAndUpdate(
                  query,
                  { $set: updateData },
                  { new: true, runValidators: true }
            )
                  .populate('classId', 'title description instructor location capacity status')
                  .lean();
      }

      /**
       * Get calendar view data (instances within date range with class details)
       */
      async getCalendarView(
            startDate: Date,
            endDate: Date
      ): Promise<any[]> {
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setHours(23, 59, 59, 999);

            // Get one-time classes
            const oneTimeClasses = await Class.find({
                  isRecurring: false,
                  scheduledDate: { $gte: startDate, $lte: adjustedEndDate },
            }).lean();

            // Get recurring class instances
            const instances = await ClassInstance.find({
                  scheduledDate: { $gte: startDate, $lte: adjustedEndDate },
            })
                  .populate('classId', 'title description instructor location capacity status')
                  .lean();

            // Format one-time classes
            const oneTimeEvents = oneTimeClasses.map(cls => ({
                  id: cls._id,
                  type: 'one-time',
                  title: cls.title,
                  description: cls.description,
                  instructor: cls.instructor,
                  location: cls.location,
                  capacity: cls.capacity,
                  scheduledDate: cls.scheduledDate,
                  startTime: cls.startTime,
                  endTime: cls.endTime,
                  status: cls.status,
            }));

            // Format recurring instances
            const recurringEvents = instances
                  .filter(inst => inst.classId) // Filter out orphaned instances
                  .map(inst => ({
                        id: inst._id,
                        classId: (inst.classId as any)._id,
                        type: 'recurring-instance',
                        title: (inst.classId as any).title,
                        description: (inst.classId as any).description,
                        instructor: (inst.classId as any).instructor,
                        location: (inst.classId as any).location,
                        capacity: (inst.classId as any).capacity,
                        scheduledDate: inst.scheduledDate,
                        startTime: inst.startTime,
                        endTime: inst.endTime,
                        status: inst.status,
                  }));

            // Combine and sort by date and time
            return [...oneTimeEvents, ...recurringEvents].sort((a, b) => {
                  const dateA = new Date(a.scheduledDate as Date);
                  const dateB = new Date(b.scheduledDate as Date);
                  if (dateA.getTime() !== dateB.getTime()) {
                        return dateA.getTime() - dateB.getTime();
                  }
                  return (a.startTime || '').localeCompare(b.startTime || '');
            });
      }

      /**
       * Regenerate instances for a recurring class (useful after updates)
       */
      async regenerateInstances(classId: string): Promise<IClassInstance[]> {
            const classDoc = await Class.findById(classId);
            if (!classDoc || !classDoc.isRecurring || !classDoc.recurrence) {
                  return [];
            }

            const today = normalizeDate(new Date());

            // Delete existing future instances that are 'scheduled' AND unmodified
            await ClassInstance.deleteMany({
                  classId,
                  scheduledDate: { $gte: today },
                  status: 'scheduled',
                  $expr: { $eq: ['$updatedAt', '$createdAt'] }
            });

            // Fetch existing instances that are NOT 'scheduled' OR have been modified
            const existingExceptions = await ClassInstance.find({
                  classId,
                  scheduledDate: { $gte: today },
                  $or: [
                        { status: { $ne: 'scheduled' } },
                        { $expr: { $gt: ['$updatedAt', '$createdAt'] } }
                  ]
            }).lean();

            // Regenerate all instances based on original recurrence config without saving
            const recurrence = classDoc.recurrence;

            const allInstances = await this.generateInstances(
                  classId,
                  recurrence,
                  365,
                  false
            ) as Partial<IClassInstance>[];

            // Filter only future ones (from today)
            const futureInstances = allInstances.filter(inst =>
                  inst.scheduledDate && new Date(inst.scheduledDate) >= today
            );

            // Filter out instances that conflict with existing exceptions (same date and same start time)
            const validInstances = futureInstances.filter(newInst => {
                  const isConflict = existingExceptions.some(ex =>
                        new Date(ex.scheduledDate).getTime() === new Date(newInst.scheduledDate!).getTime() &&
                        ex.startTime === newInst.startTime
                  );
                  return !isConflict;
            });

            // Insert validity filtered instances
            if (validInstances.length > 0) {
                  const savedInstances = await ClassInstance.insertMany(validInstances);
                  return savedInstances as unknown as IClassInstance[];
            }

            return [];
      }

      /**
       * Update all instances of a specific class
       */
      async updateAllInstances(
            classId: string,
            updateData: Partial<IClassInstance>
      ): Promise<number> {
            const result = await ClassInstance.updateMany(
                  { classId },
                  { $set: updateData },
                  { runValidators: true }
            );
            return result.modifiedCount;
      }
}

export default new CalanderService();
