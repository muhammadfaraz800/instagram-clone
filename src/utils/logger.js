import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'log.txt');

/**
 * Logs user actions to a file.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {string} username - Username associated with the action
 * @param {string} status - Status of the action (e.g., 'success', 'failed')
 */
export const logAction = (method, url, username, status) => {
    const logMessage = `${Date.now()} ${method} ${url} ${username} ${status} \n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
};
