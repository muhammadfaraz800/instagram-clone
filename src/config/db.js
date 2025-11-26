import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
};

let pool;

export async function initializeDatabase() {
    try {
        console.log(`Attempting to connect to Oracle DB...`);
        // It's often better not to log credentials, even partially, in production, but for this dev setup I'll keep the user log.
        console.log(`User: ${dbConfig.user}`);

        pool = await oracledb.createPool(dbConfig);
        console.log('Oracle Database pool created successfully');

        // Verify connection
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1 FROM DUAL');
        console.log('Connection test successful: Database is accessible');
        await connection.close();
    } catch (err) {
        console.error('Error initializing Oracle Database:', err);
        process.exit(1); // Exit if DB fails
    }
}

export async function closeDatabase() {
    try {
        if (pool) {
            await pool.close(0);
            console.log('Oracle Database pool closed');
        }
    } catch (err) {
        console.error('Error closing Oracle Database pool', err);
    }
}

export function getPool() {
    if (!pool) {
        throw new Error('Database pool has not been initialized.');
    }
    return pool;
}
