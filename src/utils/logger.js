/**
 * Logger Utility - Native MongoDB Driver
 * Logs actions to separate collections by category
 * Collections: logs_account, logs_upload, logs_delete, logs_error
 */
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dbms_project';

let db = null;
let client = null;

/**
 * Connect to MongoDB using native driver
 */
export const connectLogger = async () => {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Logger connected to MongoDB (dbms_project)');
    } catch (error) {
        console.error('Logger MongoDB connection error:', error);
    }
};

/**
 * Log an action to MongoDB
 * @param {string} category - Collection category: 'account', 'upload', 'delete', 'error'
 * @param {string} action - Specific action: 'signup', 'signin', 'content', 'post', 'account', 'oracle'
 * @param {string|object} user - User ID or username (optional)
 * @param {object} meta - Additional metadata (optional)
 */
export const logAction = async (category, action, user = null, meta = {}) => {
    try {
        if (!db) {
            console.warn('Logger not connected to MongoDB');
            return;
        }

        const logEntry = {
            action,
            user,
            meta,
            timestamp: new Date()
        };

        // Insert into the appropriate collection based on category
        const collectionName = `logs_${category}`;
        await db.collection(collectionName).insertOne(logEntry);

        // Console log for debug (optional)
        // console.log(`[LOG - ${category}/${action}] User: ${user}`);
    } catch (error) {
        console.error('Logging failed:', error);
        console.error('Failed Log Details:', { category, action, user, meta });
        // Fail silently so it doesn't break the main flow
    }
};
