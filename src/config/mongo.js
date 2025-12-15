/**
 * MongoDB Configuration - Native Driver
 * Only used for logging (main data is in Oracle)
 */
import { connectLogger } from '../utils/logger.js';

const connectDB = async () => {
    await connectLogger();
};

export default connectDB;
