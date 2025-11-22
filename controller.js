import { getPool } from './db.js';

export const signupPostController = async (req, res) => {
  const { name, username, email, password } = req.body;
  console.log("Received signup:", req.body);

  let connection;
  try {
    connection = await getPool().getConnection();
    const result = await connection.execute(
      `INSERT INTO users (name, username, email, password) VALUES (:name, :username, :email, :password)`,
      { name, username, email, password },
      { autoCommit: true }
    );
    console.log("Rows inserted: " + result.rowsAffected);
    res.send("Account Created");
  } catch (err) {
    console.error("Error executing insert", err);
    res.status(500).send("Error saving data");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection", err);
      }
    }
  }
};
