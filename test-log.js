import mongoose from 'mongoose';
import Log from './src/models/Log.js';

const MONGO_URI = 'mongodb://localhost:27017/dbms_project';

const testMongo = async () => {
    try {
        console.log('Attempting to connect to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('Attempting to create a log entry...');
        const log = await Log.create({
            log_type: 'system',
            description: 'Manual Test Log',
            user: 'test_script_user',
            meta: { source: 'test-log.js' }
        });
        console.log('Log created successfully:', log);

        const found = await Log.findById(log._id);
        console.log('Log retrieved from DB:', found);

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

testMongo();
