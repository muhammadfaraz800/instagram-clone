import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
};

export async function initialize() {
  try {
    console.log(`Attempting to connect to Oracle DB...`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Connection String: ${dbConfig.connectString}`);
    await oracledb.createPool(dbConfig);
    console.log('Oracle Database pool created successfully');

    // Verify connection
    const connection = await oracledb.getConnection();
    await connection.execute('SELECT 1 FROM DUAL');
    console.log('Connection test successful: Database is accessible');
    await connection.close();
  } catch (err) {
    console.error('Error initializing Oracle Database:', err);
    process.exit(1);
  }
}

export async function close() {
  try {
    await oracledb.getPool().close(0);
    console.log('Oracle Database pool closed');
  } catch (err) {
    console.error('Error closing Oracle Database pool', err);
  }
}

export function getPool() {
  return oracledb.getPool();
}
