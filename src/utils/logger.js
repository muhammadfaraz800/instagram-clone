import Log from '../models/Log.js';

/**
 * Logs an action to MongoDB
 * @param {string} type - The type of log (e.g., 'user', 'error')
 * @param {string} description - Description of the event
 * @param {string|object} user - User ID or username (optional)
 * @param {object} meta - Additional metadata (optional)
 */
export const logAction = async (type, description, user = null, meta = {}) => {
    try {
        await Log.create({
            log_type: type,
            description,
            user,
            meta
        });
        // Console log for debug (optional, can be removed)
        // console.log(`[LOG - ${type}] ${description}`);
    } catch (error) {
        console.error('Logging failed:', error);
        console.error('Failed Log Details:', { type, description, user, meta });
        // Fail silently so it doesn't break the main flow
    }
};
