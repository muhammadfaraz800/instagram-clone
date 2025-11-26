import { getPool } from './db.js';
import fs from 'fs';

// Signup
export const signupPostController = async (req, res) => {
  const password = req.body.password;
  const username = req.body.username?.toLowerCase();
  const email = req.body.email?.toLowerCase();
  const name = req.body.name?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  // Validate required fields
  if (!name || !username || !email || !password) {
    return res.status(400).send("Name, username, email, and password are required.");
  }

  console.log("Received signup:", req.body);

  let connection;
  try {
    connection = await getPool().getConnection();
    const result = await connection.execute(
      `INSERT INTO users (name, username, email, password) VALUES (:name, :username, :email, :password)`,
      { name, username, email, password }, // Bind variables
      { autoCommit: true }
    );
    console.log("Rows inserted: " + result.rowsAffected);
    res.send("Account Created");
  } catch (err) {
    console.error("Error executing insert", err);

    // Handle Unique Constraint Violation (ORA-00001)
    if (err.errorNum === 1) {
      return res.status(409).send("Username or Email already exists");
    }

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

// Login
export const loginPostController = async (req, res) => {
  const username = req.body.username?.toLowerCase();
  const password = req.body.password;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  console.log("Received login:", req.body);

  let connection;
  try {
    connection = await getPool().getConnection();
    const result = await connection.execute(
      `SELECT * FROM USERS WHERE USERNAME=:username AND PASSWORD=:password`,
      { username, password },
      { autoCommit: true }
    );
    let loggedInStatus = "failed";
    console.log("Rows selected: " + result.rows.length);
    if (result.rows.length === 1) {
      res.send("Login successful");
      loggedInStatus = "success";
      console.log(`Logged in successfully: ${username}`);
    } else {
      res.status(401).send("Invalid username or password");
      loggedInStatus = "failed";
      console.log(`Logged in failed: ${username}`);
    }

    // Logging logic
    fs.appendFile('log.txt', `${Date.now()} ${req.method} ${req.url} ${username} ${loggedInStatus} \n`, (err) => {
      if (err) console.log(err);
    });

  } catch (err) {
    console.error("Error executing select", err);
    res.status(500).send("Error logging in");
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