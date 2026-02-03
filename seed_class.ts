
import mongoose from 'mongoose';
import CalanderService from './src/modules/calander/calander.service';

async function seed() {
      try {
            await mongoose.connect('mongodb://calanderuser:Password%40123@localhost:27017/calander-db?authSource=admin');
            console.log('Connected to DB');

            console.log('Creating a test class for 2026-02-03...');

            // Ensure we create an instance for the requested date: 2026-02-03 (Tuesday)
            // We'll create a weekly recurrence on Tuesdays

            const classData = {
                  title: 'Test Class for API Check',
                  description: 'Created to verify PUT /instances/specific',
                  instructor: 'Test Instructor',
                  location: 'Room 101',
                  capacity: 20,
                  isRecurring: true,
                  recurrence: {
                        type: 'weekly',
                        startDate: new Date('2026-02-01'), // Start before the target
                        dayWiseTimeSlots: [
                              {
                                    day: 'tuesday',
                                    timeSlots: [{ startTime: '09:00', endTime: '10:00', status: 'scheduled' }]
                              }
                        ]
                  }
            };

            const result = await CalanderService.createClass(classData);
            console.log('Class Created Successfully!');
            console.log('Class ID:', result.class._id);

            // Find the instance for 2026-02-03
            const instance = result.instances?.find(i => {
                  const d = new Date(i.scheduledDate);
                  console.log(`Checking Instance: ${d.toString()} (ISO: ${d.toISOString()})`);
                  // Check if it's Feb 3rd 2026 in local time
                  return d.getFullYear() === 2026 && d.getMonth() === 1 && d.getDate() === 3;
            });

            if (instance) {
                  console.log(`✅ MATCHING INSTANCE EXISTs!`);
                  console.log(`Instance ID: ${instance._id}`);
                  console.log(`Date: ${instance.scheduledDate}`);
                  console.log(`Type this URL in Postman/Browser:`);
                  console.log(`http://localhost:3000/api/v1/calander/${result.class._id}/instances/specific?scheduledDate=2026-02-03&startTime=09:00`);
                  console.log(`Body (JSON): { "status": "cancelled" }`);
            } else {
                  console.log('❌ Failed to generate the specific instance.');
            }

      } catch (e) {
            console.error(e);
      } finally {
            await mongoose.disconnect();
      }
}

seed();
