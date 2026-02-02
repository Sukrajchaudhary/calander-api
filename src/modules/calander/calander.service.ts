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

class CalanderService {
      /**
       * Generate class instances for a recurring class
       */
      private async generateInstances(
            classId: string,
            recurrence: IRecurrenceConfig,
            maxInstances: number = 365
      ): Promise<IClassInstance[]> {
            const instances: Partial<IClassInstance>[] = [];
            const startDate = new Date(recurrence.startDate);
            const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
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

            // Helper to create instance objects for a date with time slots
            const createInstancesForDate = (date: Date, timeSlots: ITimeSlot[]) => {
                  for (const slot of timeSlots) {
                        if (!isWithinBounds(date)) break;
                        instances.push({
                              classId: classId as any,
                              scheduledDate: new Date(date),
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                              status: 'scheduled',
                        });
                        occurrenceCount++;
                  }
            };

            switch (recurrence.type) {
                  case 'daily': {
                        const timeSlots = recurrence.dailyTimeSlots || [];
                        while (isWithinBounds(currentDate)) {
                              createInstancesForDate(currentDate, timeSlots);
                              currentDate = addDays(currentDate, 1);
                        }
                        break;
                  }

                  case 'weekly': {
                        const weeklyDays = recurrence.weeklyDays || [];
                        const timeSlots = recurrence.weeklyTimeSlots || [];
                        const targetDays = weeklyDays.map(d => DAY_MAP[d.toLowerCase() as DayOfWeek]);

                        // Find the first occurrence
                        while (!targetDays.includes(currentDate.getDay())) {
                              currentDate = addDays(currentDate, 1);
                        }

                        while (isWithinBounds(currentDate)) {
                              const dayOfWeek = currentDate.getDay();
                              if (targetDays.includes(dayOfWeek)) {
                                    createInstancesForDate(currentDate, timeSlots);
                              }
                              currentDate = addDays(currentDate, 1);
                              // If we've gone through all days, skip to next week
                              if (currentDate.getDay() === 0 && !targetDays.includes(0)) {
                                    // Reset to find next target day
                              }
                        }
                        break;
                  }

                  case 'monthly': {
                        const monthlyDays = recurrence.monthlyDays || [];
                        const timeSlots = recurrence.monthlyTimeSlots || [];

                        // Start from the first month
                        currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

                        while (isWithinBounds(currentDate)) {
                              for (const dayOfMonth of monthlyDays) {
                                    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);

                                    // Check if the day exists in this month (e.g., Feb 31 doesn't exist)
                                    if (targetDate.getMonth() !== currentDate.getMonth()) continue;

                                    // Skip if before start date
                                    if (targetDate < startDate) continue;

                                    if (!isWithinBounds(targetDate)) break;

                                    createInstancesForDate(targetDate, timeSlots);
                              }
                              // Move to next month
                              currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                        }
                        break;
                  }

                  case 'custom': {
                        const customDays = recurrence.customDays || [];
                        const timeSlots = recurrence.customTimeSlots || [];
                        const interval = recurrence.customInterval || 1;
                        const targetDays = customDays.map(d => DAY_MAP[d.toLowerCase() as DayOfWeek]);

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
                                                createInstancesForDate(checkDate, timeSlots);
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

            // Bulk insert instances if any were generated
            if (instances.length > 0) {
                  const savedInstances = await ClassInstance.insertMany(instances);
                  return savedInstances as unknown as IClassInstance[];
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
                        classData.recurrence
                  );
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
            const { startDate, endDate, status, isRecurring, page = 1, limit = 10 } = filters;
            const skip = (page - 1) * limit;

            const query: any = {};

            if (status) {
                  query.status = status;
            }

            if (isRecurring !== undefined) {
                  query.isRecurring = isRecurring;
            }

            if (startDate && endDate) {
                  query.$or = [
                        // One-time classes within date range
                        {
                              isRecurring: false,
                              scheduledDate: { $gte: startDate, $lte: endDate },
                        },
                        // Recurring classes that overlap with date range
                        {
                              isRecurring: true,
                              'recurrence.startDate': { $lte: endDate },
                              $or: [
                                    { 'recurrence.endDate': { $gte: startDate } },
                                    { 'recurrence.endDate': { $exists: false } },
                              ],
                        },
                  ];
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
      async updateClass(id: string, updateData: Partial<IClass>): Promise<IClass | null> {
            const updatedClass = await Class.findByIdAndUpdate(
                  id,
                  { $set: updateData },
                  { new: true, runValidators: true }
            ).lean();

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
            const query: any = {
                  scheduledDate: { $gte: startDate, $lte: endDate },
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
      ): Promise<IClassInstance | null> {
            return ClassInstance.findByIdAndUpdate(
                  instanceId,
                  { status },
                  { new: true }
            ).lean();
      }

      /**
       * Get calendar view data (instances within date range with class details)
       */
      async getCalendarView(
            startDate: Date,
            endDate: Date
      ): Promise<any[]> {
            // Get one-time classes
            const oneTimeClasses = await Class.find({
                  isRecurring: false,
                  status: 'active',
                  scheduledDate: { $gte: startDate, $lte: endDate },
            }).lean();

            // Get recurring class instances
            const instances = await ClassInstance.find({
                  scheduledDate: { $gte: startDate, $lte: endDate },
                  status: { $ne: 'cancelled' },
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

            // Delete existing future instances
            await ClassInstance.deleteMany({
                  classId,
                  scheduledDate: { $gte: new Date() },
                  status: 'scheduled',
            });

            // Regenerate instances from today
            const recurrence = JSON.parse(JSON.stringify(classDoc.recurrence));
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (new Date(recurrence.startDate) < today) {
                  recurrence.startDate = today;
            }

            return this.generateInstances(classId, recurrence);
      }
}

export default new CalanderService();
