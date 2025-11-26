// import oracledb from 'oracledb';
// import dotenv from 'dotenv';

// dotenv.config();

// async function run() {
//     let connection;

//     try {
//         console.log('Connecting to Oracle DB...');
//         console.log(`User: ${process.env.DB_USER}`);
//         console.log(`Connection String: ${process.env.DB_CONNECTION_STRING}`);

//         connection = await oracledb.getConnection({
//             user: process.env.DB_USER,
//             password: process.env.DB_PASSWORD,
//             connectString: process.env.DB_CONNECTION_STRING,
//         });

//         console.log('Connected!');

//         const result = await connection.execute(
//             `INSERT INTO users (name, username, email, password) VALUES (:name, :username, :email, :password)`,
//             {
//                 name: 'Test User',
//                 username: 'testuser',
//                 email: 'test@example.com',
//                 password: 'password123'
//             },
//             { autoCommit: true }
//         );

//         console.log("Rows inserted: " + result.rowsAffected);

//     } catch (err) {
//         console.error('Error:', err);
//     } finally {
//         if (connection) {
//             try {
//                 await connection.close();
//             } catch (err) {
//                 console.error(err);
//             }
//         }
//     }
// }

// run();
