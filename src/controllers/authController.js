import { getPool } from '../config/db.js';
import { logAction } from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';

/**
 * Handle user signup
 */

export const signup = async (req, res) => {
    const { username, email, password, name, account_type } = req.body;

    // Validate required fields
    if (!name || !username || !email || !password || !account_type) {
        return res.status(400).send({ message: "All fields are required." });
    }

    console.log("Processing signup for:", username);

    let connection;
    try {
        // console.log("Hashing password...");
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // console.log("Getting DB connection...");
        connection = await getPool().getConnection();

        // Start Transaction
        // console.log("Starting transaction...");

        // 1. Insert into Parent Table (Accounts)
        await connection.execute(
            `INSERT INTO Accounts (username, email, hashed_password, profile_name, account_type) 
             VALUES (:username, :email, :password, :name, :account_type)`,
            {
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password: hashedPassword,
                name: name,
                account_type
            },
            { autoCommit: false }
        );

        // 2. Insert into Child Table based on Account Type
        if (account_type === 'Business') {
            const { bio_url, contact_no, business_type } = req.body;
            await connection.execute(
                `INSERT INTO Business_Account (UserName, Bio_URL, CONTACT_NO, Business_Type) 
                 VALUES (:username, :bio_url, :contact_no, :business_type)`,
                {
                    username: username.toLowerCase(),
                    bio_url: bio_url || null,
                    contact_no: contact_no || null,
                    business_type: business_type || null
                },
                { autoCommit: false }
            );
        } else if (account_type === 'Normal') {
            const { gender } = req.body;
            await connection.execute(
                `INSERT INTO Normal_Account (UserName, Gender) 
                 VALUES (:username, :gender)`,
                {
                    username: username.toLowerCase(),
                    gender: gender || null
                },
                { autoCommit: false }
            );
        } else {
            throw new Error("Invalid account type");
        }

        // Commit Transaction
        await connection.commit();
        console.log("Transaction committed. Account created.");

        res.status(201).send({ message: "Account Created", username: username });

    } catch (err) {
        console.error("Error executing signup transaction", err);

        if (connection) {
            try {
                await connection.rollback();
                console.log("Transaction rolled back.");
            } catch (rbErr) {
                console.error("Error rolling back", rbErr);
            }
        }

        // Handle Unique Constraint Violation (ORA-00001)
        if (err.errorNum === 1) {
            return res.status(409).send({ message: "Username or Email already exists" });
        }

        res.status(500).send({ message: "Error saving data: " + err.message });
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
        return res.status(400).send({ message: "Username and password are required." });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        // resultObj is an give metaData and rows in json format
        const resultObj = await connection.execute(
            `SELECT username, hashed_password, account_type, profile_picture_url FROM ACCOUNTS WHERE USERNAME=:username`,
            { username },
            { outFormat: 4002 }
        );

        let loggedInStatus = "failed";

        if (resultObj.rows && resultObj.rows.length === 1) {
            const user = resultObj.rows[0];
            const match = await bcrypt.compare(password, user.HASHED_PASSWORD);

            if (match) {
                const token = generateToken(user.USERNAME);

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                    maxAge: 3600000 // 1 hour
                });

                res.send({
                    message: "Login successful",
                    username: user.USERNAME,
                    accountType: user.ACCOUNT_TYPE,
                    profilePictureUrl: user.PROFILE_PICTURE_URL || '/uploads/default/default-avatar.png'
                });
                loggedInStatus = "success";
                console.log(`Logged in successfully: ${username}`);
            } else {
                res.status(401).send({ message: "Invalid username or password" });
                loggedInStatus = "failed";
                console.log(`Logged in failed: ${username}`);
            }
        } else {
            res.status(401).send({ message: "Invalid username or password" });
            loggedInStatus = "failed";
            console.log(`Logged in failed: ${username}`);
        }

        logAction(req.method, req.url, username, loggedInStatus);

    } catch (err) {
        console.error("Error executing select", err);
        res.status(500).send({ message: "Error logging in" });
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

export const getMe = async (req, res) => {
    const username = req.username; // Set by verifyToken
    let connection;
    try {
        connection = await getPool().getConnection();
        const result = await connection.execute(
            `SELECT username, account_type, profile_picture_url FROM ACCOUNTS WHERE USERNAME = :username`,
            { username },
            { outFormat: 4002 }
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.send({
                username: user.USERNAME,
                accountType: user.ACCOUNT_TYPE,
                profilePictureUrl: user.PROFILE_PICTURE_URL || '/uploads/default/default-avatar.png'
            });
        } else {
            res.status(404).send({ message: "User not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).send({ message: "Logged out successfully" });
};
