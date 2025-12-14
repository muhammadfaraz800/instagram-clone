/**
 * Update user details
 */
import { getPool } from "../config/db.js";

export const updateUser = async (req, res) => {
    const { profile_name, email, bio, business_type } = req.body;
    let visibility = req.body.visibility;
    if (business_type) { visibility = 'Public' };
    const username = req.username; // From verifyToken middleware

    if (!username) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    if (!email) {
        return res.status(400).send({ message: 'Email is required' });
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send({ message: 'Invalid email format' });
    }
    if (!profile_name) {
        return res.status(400).send({ message: 'Profile name is required' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();
        // 1. Update Account Table (Common fields)

        const accountResult = await connection.execute(
            `UPDATE Account 
             SET 
                 PROFILE_NAME = NVL(:profile_name, PROFILE_NAME), 
                 EMAIL = NVL(:email, EMAIL), 
                 VISIBILITY = NVL(:visibility, VISIBILITY),
                 BIO = :bio
             WHERE USERNAME = :username`,
            {
                profile_name: profile_name || '',
                email: email || '',
                bio: bio || '',
                visibility: visibility,
                username: username
            },
            { autoCommit: false }
        );

        // Verify user exists
        if (accountResult.rowsAffected === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Update Child Table
        const { website, contact_no } = req.body;

        if (website) {
            const urlRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
            if (!urlRegex.test(website.trim())) {
                await connection.rollback();
                return res.status(400).json({ message: 'Invalid website URL' });
            }
        }

        // Attempt Business Update - verify user is actually a business account
        if (business_type) {
            const businessResult = await connection.execute(
                `
            UPDATE Business
            SET 
                ContactNo = :contactNo,
                Bio_URL = :bioUrl
            WHERE UserName = :current_user`,
                {
                    contactNo: contact_no || '',
                    bioUrl: website || '',
                    current_user: username
                },
                { autoCommit: false }
            );

            // If no rows affected, user is not a business account
            if (businessResult.rowsAffected === 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Account is not a business account' });
            }
        }

        await connection.commit();
        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update error:', error);
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error(e); }
        }
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

// Delete user account
export const deleteAccount = async (req, res) => {
    const username = req.username; // From verifyToken middleware

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        // Delete from Account table - child tables (Normal, Business) should cascade
        const result = await connection.execute(
            `DELETE FROM Account WHERE UserName = :username`,
            { username: username },
            { autoCommit: false }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Clear the auth cookie    
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        await connection.commit();
        res.json({ message: 'Account deleted successfully' });

    } catch (error) {
        console.error('Delete account error:', error);
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error(e); }
        }
        res.status(500).json({ message: 'Failed to delete account', details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

// Get user settings

export const getSettings = async (req, res) => {
    let connection;
    try {
        connection = await getPool().getConnection();
        const resultObj = await connection.execute(
            `SELECT 
                    a.UserName,
                    a.Profile_Name,
                    a.Profile_Picture_URL,
                    a.Bio,
                    a.Email,
                    a.Visibility,
                    n.Gender,
                    b.Bio_URL AS Website,
                    b.ContactNo,
                    b.Business_Type,
                    v.Status AS Verification_Status
                FROM Account a
                LEFT JOIN Normal n ON a.UserName = n.UserName
                LEFT JOIN Business b ON a.UserName = b.UserName
                LEFT JOIN Verification v ON a.UserName = v.UserName
                WHERE a.UserName = :current_user`,
            {
                current_user: req.username
            },
            {
                outFormat: 4002
            }
        );

        if (resultObj.rows && resultObj.rows.length === 1) {
            const user = resultObj.rows[0];
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'Failed to fetch user settings', details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};


// Search for users
export const searchUsers = async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === '') {
        return res.json([]);
    }

    let connection;
    try {
        connection = await getPool().getConnection();
        const searchInput = q.trim();

        // Using Oracle's string concatenation || 
        const result = await connection.execute(
            `SELECT 
                a.UserName,
                a.Profile_Name,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status
            FROM Account a
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE LOWER(a.UserName) LIKE '%' || LOWER(:search_input) || '%'`,
            {
                search_input: searchInput
            },
            {
                outFormat: 4002
            }
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};
