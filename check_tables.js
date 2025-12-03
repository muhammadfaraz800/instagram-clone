import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECTION_STRING
        });

        const result = await connection.execute(
            `SELECT table_name FROM user_tables WHERE table_name IN ('NORMAL_ACCOUNT', 'BUSINESS_ACCOUNT')`
        );
        console.log('Found tables:', result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

checkTables();
