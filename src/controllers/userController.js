/**
 * Update user details
 */
import { getPool } from "../config/db.js";

export const updateUser = async (req, res) => {
    const { profile_name, email, bio, visibility, business_type } = req.body;
    if (business_type) { visibility = 'Public' };
    const username = req.username; // From verifyToken middleware

    if (!username) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    if (!email) {
        return res.status(400).send({ message: 'Email is required' });
    }
    if (!profile_name) {
        return res.status(400).send({ message: 'Profile name is required' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();
        // 1. Update Account Table (Common fields)

        await connection.execute(
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

        // 2. Update Child Table
        const { website, contact_no } = req.body;

        if (website) {
            const urlRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
            if (!urlRegex.test(website.trim())) {
                await connection.rollback();
                return res.status(400).json({ message: 'Invalid website URL' });
            }
        }

        // Attempt Business Update
        if (business_type) {

            await connection.execute(
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
                    b.Business_Type
                FROM Account a
                LEFT JOIN Normal n ON a.UserName = n.UserName
                LEFT JOIN Business b ON a.UserName = b.UserName
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