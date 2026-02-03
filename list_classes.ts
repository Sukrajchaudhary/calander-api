
import mongoose from 'mongoose';
import { Class } from './src/modules/calander/calander.model';

async function listAll() {
      try {
            await mongoose.connect('mongodb://calanderuser:Password%40123@localhost:27017/calander-db?authSource=admin');
            const count = await Class.countDocuments();
            console.log(`Total Classes: ${count}`);

            const classes = await Class.find({}, '_id title').limit(5);
            classes.forEach(c => console.log(`${c._id}: ${c.title}`));

      } catch (e) {
            console.error(e);
      } finally {
            await mongoose.disconnect();
      }
}
listAll();
