/**
 * Profile Picture Upload Controller
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPool } from "../config/db.js";

// Ensure upload directory exists
const uploadDir = 'uploads/pfp';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const username = req.username || 'user';
        const timestamp = Date.now();
        const ext = '.png'; // We'll always save as PNG from canvas
        cb(null, `${username}_${timestamp}${ext}`);
    }
});

// File filter - accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
    }
};

// Multer upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// Default profile picture path
const DEFAULT_PROFILE_PICTURE = '/uploads/default/default-avatar.png';

// Remove profile picture (reset to default)
export const removeProfilePicture = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        // Update the profile picture URL to default (don't delete old file)
        const result = await connection.execute(
            `UPDATE Account 
             SET PROFILE_PICTURE_URL = :profile_picture_url
             WHERE USERNAME = :username`,
            {
                profile_picture_url: DEFAULT_PROFILE_PICTURE,
                username: username
            },
            { autoCommit: true }
        );

        // Verify user exists
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile picture removed successfully',
            profilePictureUrl: DEFAULT_PROFILE_PICTURE
        });

    } catch (error) {
        console.error('Error removing profile picture:', error);
        res.status(500).json({
            error: 'Failed to remove profile picture',
            details: error.message
        });
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

// Upload profile picture handler
export const uploadProfilePicture = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    let connection;
    try {
        // Build the relative URL path for the uploaded file
        const profilePictureUrl = `/uploads/pfp/${req.file.filename}`;

        connection = await getPool().getConnection();

        // Update the profile picture URL in the database
        const result = await connection.execute(
            `UPDATE Account 
             SET PROFILE_PICTURE_URL = :profile_picture_url
             WHERE USERNAME = :username`,
            {
                profile_picture_url: profilePictureUrl,
                username: username
            },
            { autoCommit: true }
        );

        // Verify user exists - clean up file if not
        if (result.rowsAffected === 0) {
            if (req.file && req.file.path) {
                try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            }
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile picture updated successfully',
            profilePictureUrl: profilePictureUrl
        });

    } catch (error) {
        console.error('Error uploading profile picture:', error);

        // Clean up the uploaded file if database update fails
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }

        res.status(500).json({
            error: 'Failed to update profile picture',
            details: error.message
        });
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
