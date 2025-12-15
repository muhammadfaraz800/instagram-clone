import { getPool } from '../config/db.js';
import { logAction } from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';
import { DEFAULT_AVATAR_PATH } from '../utils/constants.js';

/**
 * Handle user signup
 */

export const signup = async (req, res) => {
    const { username, email, password, name, account_type, business_type, gender } = req.body;

    // Validate required fields
    if (!name || !username || !email || !password || !account_type) {
        return res.status(400).send({ message: "All fields are required." });
    }
    if (account_type !== 'Business' && account_type !== 'Normal') {
        return res.status(400).send({ message: "Invalid account type." });
    }
    if (account_type == 'Business') {
        if (!business_type) {
            return res.status(400).send({ message: "Business type is required." });
        }
    } else if (account_type == 'Normal') {
        if (!gender) {
            return res.status(400).send({ message: "Gender is required." });
        }
    }
    // if (password.length < 8) {
    //     return res.status(400).send({ message: "Password must be at least 8 characters long." });
    // }
    if (username.length < 3) {
        return res.status(400).send({ message: "Username must be at least 3 characters long." });
    }
    if (username.length > 20) {
        return res.status(400).send({ message: "Username must be at most 20 characters long." });
    }
    // Block reserved usernames that conflict with application routes
    const reservedUsernames = ['api', 'uploads', 'explore', 'reels', 'login', 'signup', 'settings', 'index', 'admin', 'static'];
    if (reservedUsernames.includes(username.toLowerCase())) {
        return res.status(400).send({ message: "This username is not available." });
    }
    if (email.length < 5) {
        return res.status(400).send({ message: "Email must be at least 5 characters long." });
    }
    if (email.length > 50) {
        return res.status(400).send({ message: "Email must be at most 50 characters long." });
    }
    if (name.length < 2) {
        return res.status(400).send({ message: "Name must be at least 2 characters long." });
    }
    if (name.length > 50) {
        return res.status(400).send({ message: "Name must be at most 50 characters long." });
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send({ message: "Invalid email format." });
    }

    console.log("Processing signup for:", username);

    let connection;
    try {
        console.log("Hashing password...");
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("Password hashed.");

        console.log("Getting DB connection...");
        connection = await getPool().getConnection();
        console.log("DB connection acquired.");

        // Start Transaction
        console.log("Starting transaction...");

        // 1. Insert into Parent Table (Accounts)
        // console.log("Before executing insert into Account...");
        await connection.execute(
            `INSERT INTO Account (USERNAME, BIO, HASHED_PASSWORD, EMAIL, PROFILE_NAME, PROFILE_PICTURE_URL, VISIBILITY) 
             VALUES (:username, :bio, :hashed_password, :email, :profile_name, :profile_picture_url, :visibility)`,
            {
                username: username.toLowerCase(),
                bio: '',
                hashed_password: hashedPassword,
                email: email.toLowerCase(),
                profile_name: name,
                profile_picture_url: DEFAULT_AVATAR_PATH,
                visibility: 'Public'
            },
            { autoCommit: false }
        );
        // console.log("After executing insert into Account.");

        // 2. Insert into Child Table based on Account Type
        if (account_type === 'Business') {
            const { bio_url, contact_no } = req.body;
            // console.log("Before executing insert into Business...");
            await connection.execute(
                `INSERT INTO Business (USERNAME, BIO_URL, CONTACTNO, BUSINESS_TYPE) 
                 VALUES (:username, :bio_url, :contact_no, :business_type)`,
                {
                    username: username.toLowerCase(),
                    bio_url: bio_url || null,
                    contact_no: contact_no || null,
                    business_type: business_type
                },
                { autoCommit: false }
            );
            // console.log("After executing insert into Business.");
        } else if (account_type === 'Normal') {
            const { gender } = req.body;
            console.log("Before executing insert into Normal...");
            await connection.execute(
                `INSERT INTO Normal (USERNAME, GENDER) 
                 VALUES (:username, :gender)`,
                {
                    username: username.toLowerCase(),
                    gender: gender || null
                },
                { autoCommit: false }
            );
            // console.log("After executing insert into Normal.");
        } else {
            throw new Error("Invalid account type");
        }

        // Commit Transaction
        console.log("Committing transaction...");
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

        // Handle Oracle ORA-00001: unique constraint violation
        if (err.errorNum === 1) {
            // Could be username OR email - check which one exists
            return res.status(409).send({ message: "Username or Email already exists" });
        }

        res.status(500).send({ message: "Error saving data: " + err.message });
    } finally {
        if (connection) {
            try {
                console.log("Closing connection...");
                await connection.close();
                console.log("Connection closed.");
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
            `SELECT 
                a.username, 
                a.hashed_password, 
                a.profile_picture_url,
                b.business_type
             FROM Account a
             LEFT JOIN Business b ON a.UserName = b.UserName
             WHERE a.UserName = :username`,
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
                    maxAge: 3600000 * 24 // 24 hour
                });

                const accountType = user.BUSINESS_TYPE ? 'Business' : 'Normal';

                res.send({
                    message: "Login successful",
                    username: user.USERNAME,
                    accountType: accountType,
                    profilePictureUrl: user.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH
                });
                loggedInStatus = "success";
                console.log(`Logged in successfully: ${username}`);
                logAction('user', 'User Logged In', username, { status: loggedInStatus, role: accountType });
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
            `SELECT 
                a.profile_name,
                a.username, 
                a.profile_picture_url,
                b.business_type,
                v.Status AS Verification_Status
             FROM Account a
             LEFT JOIN Business b ON a.UserName = b.UserName
             LEFT JOIN Verification v ON a.UserName = v.UserName
             WHERE a.UserName = :username`,
            { username },
            { outFormat: 4002 }
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const accountType = user.BUSINESS_TYPE ? 'Business' : 'Normal';
            res.send({
                username: user.USERNAME,
                accountType: accountType,
                profileName: user.PROFILE_NAME,
                profilePictureUrl: user.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
                verificationStatus: user.VERIFICATION_STATUS
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
