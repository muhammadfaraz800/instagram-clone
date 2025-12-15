import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dbms_project';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected Successfully to dbms_project');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        // Do not exit process, just log error, so main app keeps running
    }
};

export default connectDB;
