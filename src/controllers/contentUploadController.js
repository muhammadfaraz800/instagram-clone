/**
 * Content Upload Controller
 * Handles image and reel uploads with tags
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPool } from "../config/db.js";

// ============================================
// DURATION LIMITS - Change these values only!
// ============================================
const REEL_DURATION_VERIFIED = 60;  // seconds - for verified users
const REEL_DURATION_NORMAL = 40;    // seconds - for normal users

// Ensure upload directories exist
const imageUploadDir = 'uploads/content/images';
const reelUploadDir = 'uploads/content/reels';

if (!fs.existsSync(imageUploadDir)) {
    fs.mkdirSync(imageUploadDir, { recursive: true });
}
if (!fs.existsSync(reelUploadDir)) {
    fs.mkdirSync(reelUploadDir, { recursive: true });
}

// Generate unique content ID (max 20 chars for DB compatibility)
function generateContentId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substr(2, 4);
    return `C${ts}${rand}`.substring(0, 20);
}

// Generate unique tag ID (max 20 chars for DB compatibility)
function generateTagId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substr(2, 4);
    return `T${ts}${rand}`.substring(0, 20);
}

// Configure multer storage for images
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageUploadDir);
    },
    filename: (req, file, cb) => {
        const username = req.username || 'user';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${username}_${timestamp}${ext}`);
    }
});

// Configure multer storage for reels
const reelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, reelUploadDir);
    },
    filename: (req, file, cb) => {
        const username = req.username || 'user';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `${username}_${timestamp}${ext}`);
    }
});

// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed for images.'), false);
    }
};

// File filter for reels
const reelFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only MP4, MOV, and WebM are allowed for reels.'), false);
    }
};

// Multer upload middleware for images
export const uploadImageMiddleware = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max for images
    }
});

// Multer upload middleware for reels
export const uploadReelMiddleware = multer({
    storage: reelStorage,
    fileFilter: reelFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max for reels
    }
});

/**
 * Process tags - create if not exists and return tag IDs
 * @param {object} connection - Database connection
 * @param {string[]} tags - Array of tag names
 * @returns {string[]} Array of tag IDs
 */
async function processTags(connection, tags) {
    const tagIds = [];

    for (const tagName of tags) {
        const trimmedTag = tagName.trim().toLowerCase();
        if (!trimmedTag) continue;

        // Check if tag already exists
        const existingTag = await connection.execute(
            `SELECT TagID FROM Tags WHERE LOWER(TagName) = LOWER(:tagName)`,
            { tagName: trimmedTag },
            { outFormat: 4002 }
        );

        if (existingTag.rows && existingTag.rows.length > 0) {
            tagIds.push(existingTag.rows[0].TAGID);
        } else {
            // Create new tag
            const newTagId = generateTagId();
            await connection.execute(
                `INSERT INTO Tags (TagID, TagName) VALUES (:tagId, :tagName)`,
                { tagId: newTagId, tagName: trimmedTag },
                { autoCommit: false }
            );
            tagIds.push(newTagId);
        }
    }

    return tagIds;
}

/**
 * Link content to tags
 * @param {object} connection - Database connection
 * @param {string} contentId - Content ID
 * @param {string[]} tagIds - Array of tag IDs
 */
async function linkContentToTags(connection, contentId, tagIds) {
    for (const tagId of tagIds) {
        await connection.execute(
            `INSERT INTO Content_Tag (ContentID, TagID) VALUES (:contentId, :tagId)`,
            { contentId, tagId },
            { autoCommit: false }
        );
    }
}

/**
 * Get user verification status
 * @param {object} connection - Database connection
 * @param {string} username - Username
 * @returns {boolean} Whether user is verified
 */
async function isUserVerified(connection, username) {
    const result = await connection.execute(
        `SELECT Status FROM Verification WHERE LOWER(UserName) = LOWER(:username)`,
        { username },
        { outFormat: 4002 }
    );

    return result.rows && result.rows.length > 0 && result.rows[0].STATUS === 'Verified';
}

/**
 * Upload Image Handler
 * POST /api/content/upload-image
 */
export const uploadImage = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        // Get verification status for tag limits
        const verified = await isUserVerified(connection, username);
        const maxTags = verified ? 5 : 3;

        // Parse tags from request
        let tags = [];
        if (req.body.tags) {
            try {
                tags = typeof req.body.tags === 'string'
                    ? req.body.tags.split(',').map(t => t.trim()).filter(t => t)
                    : req.body.tags;
            } catch (e) {
                tags = [];
            }
        }

        // Limit tags based on verification status
        if (tags.length > maxTags) {
            tags = tags.slice(0, maxTags);
        }

        const caption = req.body.caption || '';
        const contentId = generateContentId();
        const imagePath = `/uploads/content/images/${req.file.filename}`;

        // Insert into Content table
        await connection.execute(
            `INSERT INTO Content (ContentID, UserName, Caption, Path) 
             VALUES (:contentId, :userName, :caption, :path)`,
            {
                contentId,
                userName: username,
                caption,
                path: imagePath
            },
            { autoCommit: false }
        );

        // Insert into Image table
        await connection.execute(
            `INSERT INTO Image (ContentID) VALUES (:contentId)`,
            { contentId },
            { autoCommit: false }
        );

        // Process and link tags
        if (tags.length > 0) {
            const tagIds = await processTags(connection, tags);
            await linkContentToTags(connection, contentId, tagIds);
        }

        // Commit transaction
        await connection.commit();

        res.json({
            message: 'Image uploaded successfully',
            contentId,
            path: imagePath,
            tagsApplied: tags.length,
            maxTagsAllowed: maxTags
        });

    } catch (error) {
        console.error('Error uploading image:', error);

        // Rollback transaction
        if (connection) {
            try { await connection.rollback(); } catch (e) { /* ignore */ }
        }

        // Clean up uploaded file
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }

        res.status(500).json({
            error: 'Failed to upload image',
            details: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Upload Reel Handler
 * POST /api/content/upload-reel
 */
export const uploadReel = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        // Get verification status
        const verified = await isUserVerified(connection, username);
        const maxDuration = verified ? REEL_DURATION_VERIFIED : REEL_DURATION_NORMAL;
        const maxTags = verified ? 5 : 3;

        // Validate duration (sent from frontend)
        const duration = parseFloat(req.body.duration) || 0;
        if (duration > maxDuration) {
            // Clean up uploaded file
            if (req.file && req.file.path) {
                try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            }
            return res.status(400).json({
                error: `Reel duration exceeds maximum allowed (${maxDuration} seconds)`,
                maxDuration,
                providedDuration: duration
            });
        }

        // Parse tags
        let tags = [];
        if (req.body.tags) {
            try {
                tags = typeof req.body.tags === 'string'
                    ? req.body.tags.split(',').map(t => t.trim()).filter(t => t)
                    : req.body.tags;
            } catch (e) {
                tags = [];
            }
        }

        // Limit tags
        if (tags.length > maxTags) {
            tags = tags.slice(0, maxTags);
        }

        const caption = req.body.caption || '';
        const contentId = generateContentId();
        const reelPath = `/uploads/content/reels/${req.file.filename}`;

        // Insert into Content table
        await connection.execute(
            `INSERT INTO Content (ContentID, UserName, Caption, Path) 
             VALUES (:contentId, :userName, :caption, :path)`,
            {
                contentId,
                userName: username,
                caption,
                path: reelPath
            },
            { autoCommit: false }
        );

        // Insert into Reel table
        await connection.execute(
            `INSERT INTO Reel (ContentID, ReelDuration) VALUES (:contentId, :reelDuration)`,
            { contentId, reelDuration: Math.round(duration) },
            { autoCommit: false }
        );

        // Process and link tags
        if (tags.length > 0) {
            const tagIds = await processTags(connection, tags);
            await linkContentToTags(connection, contentId, tagIds);
        }

        // Commit transaction
        await connection.commit();

        res.json({
            message: 'Reel uploaded successfully',
            contentId,
            path: reelPath,
            duration: Math.round(duration),
            tagsApplied: tags.length,
            maxTagsAllowed: maxTags
        });

    } catch (error) {
        console.error('Error uploading reel:', error);

        // Rollback transaction
        if (connection) {
            try { await connection.rollback(); } catch (e) { /* ignore */ }
        }

        // Clean up uploaded file
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }

        res.status(500).json({
            error: 'Failed to upload reel',
            details: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Get user limits for upload
 * GET /api/content/limits
 */
export const getUploadLimits = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();
        const verified = await isUserVerified(connection, username);

        res.json({
            isVerified: verified,
            maxTags: verified ? 5 : 3,
            maxReelDuration: verified ? REEL_DURATION_VERIFIED : REEL_DURATION_NORMAL,
            maxImageSize: 10 * 1024 * 1024, // 10MB
            maxReelSize: 100 * 1024 * 1024 // 100MB
        });

    } catch (error) {
        console.error('Error getting upload limits:', error);
        res.status(500).json({ error: 'Failed to get upload limits' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};
