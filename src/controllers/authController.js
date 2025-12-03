import { getPool } from '../config/db.js';
import { logAction } from '../utils/logger.js';

/**
 * Handle user signup
 */
export const signup = async (req, res) => {
    const password = req.body.password;
    const username = req.body.username?.toLowerCase();
    const email = req.body.email?.toLowerCase();
    const name = req.body.name?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

    // Validate required fields
    if (!name || !username || !email || !password) {
        return res.status(400).send("Name, username, email, and password are required.");
    }

    console.log("Received signup:", req.body.name, req.body.username, req.body.email, "Password: ****");

    let connection;
    try {
        const accountType = req.body.account_type || 'Normal';

        connection = await getPool().getConnection();
        const result = await connection.execute(
            `INSERT INTO Accounts (username, email, hashed_password, profile_name, account_type) VALUES (:username, :email, :password, :name, :accountType)`,
            { username, email, password, name, accountType },
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

/**
 * Handle user login
 */
export const login = async (req, res) => {
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
            `SELECT * FROM ACCOUNTS WHERE USERNAME=:username AND PASSWORD=:password`,
            { username, password },
            { autoCommit: true }
        );

        let loggedInStatus = "failed";
        console.log("Rows selected: " + (result.rows ? result.rows.length : 0));

        if (result.rows && result.rows.length === 1) {
            res.send("Login successful");
            loggedInStatus = "success";
            console.log(`Logged in successfully: ${username}`);
        } else {
            res.status(401).send("Invalid username or password");
            loggedInStatus = "failed";
            console.log(`Logged in failed: ${username}`);
        }

        // Logging logic
        logAction(req.method, req.url, username, loggedInStatus);

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
