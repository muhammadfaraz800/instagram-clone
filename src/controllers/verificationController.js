import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getPool } from "../config/db.js";

// Ensure verification upload directory exists
const uploadDir = 'uploads/verification';
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
        // Get original extension
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        // Format: {username}_verification_{timestamp}{ext}
        cb(null, `${username}_verification_${timestamp}${ext}`);
    }
});

// File filter - accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
    }
};

// Multer upload middleware
export const uploadVerificationDoc = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

/**
 * Apply for verification
 * POST /api/verification/apply
 */
export const applyForVerification = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Verification document is required (Image only)' });
    }

    let connection;
    try {
        const veriDocUrl = `/uploads/verification/${req.file.filename}`;

        connection = await getPool().getConnection();

        // Check if already applied
        const checkResult = await connection.execute(
            `SELECT Status FROM Verification WHERE UserName = :username`,
            { username },
            { outFormat: 4002 } // OBJECT output
        );

        if (checkResult.rows && checkResult.rows.length > 0) {
            const status = checkResult.rows[0].STATUS;
            // Clean up uploaded file since application exists
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

            return res.status(400).json({
                message: `You have already applied. Current status: ${status}`,
                status: status
            });
        }

        // Insert into Verification table
        await connection.execute(
            `INSERT INTO Verification (
                UserName, 
                Veri_Doc_URL, 
                VerifiedAt, 
                Status
            ) VALUES (
                :userName, 
                :veriDocUrl, 
                NULL, 
                'Pending'
            )`,
            {
                userName: username,
                veriDocUrl: veriDocUrl
            },
            { autoCommit: true }
        );

        res.json({
            message: 'Verification application submitted successfully',
            status: 'Pending'
        });

    } catch (error) {
        console.error('Verification application error:', error);
        // Clean up uploaded file on error
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        res.status(500).json({ error: 'Failed to submit verification application', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Get verification status
 * GET /api/verification/status
 */
export const getVerificationStatus = async (req, res) => {
    const username = req.username;

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let connection;
    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT Status FROM Verification WHERE UserName = :username`,
            { username },
            { outFormat: 4002 }
        );

        if (result.rows && result.rows.length > 0) {
            res.json({
                applied: true,
                status: result.rows[0].STATUS
            });
        } else {
            res.json({
                applied: false,
                status: null
            });
        }

    } catch (error) {
        console.error('Error fetching verification status:', error);
        res.status(500).json({ error: 'Failed to fetch status', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};
