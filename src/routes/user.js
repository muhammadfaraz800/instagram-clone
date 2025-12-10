import express from 'express';
import { updateUser, getSettings, deleteAccount } from '../controllers/userController.js';
import { upload, uploadProfilePicture } from '../controllers/uploadController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply middleware to all routes in this router
router.use(verifyToken);

// @desc    Update user
// @route   PUT /api/user/update
// @access  Private
router.put('/update', updateUser);

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
router.get('/settings', getSettings);

// @desc    Upload profile picture
// @route   POST /api/user/upload-pfp
// @access  Private
router.post('/upload-pfp', upload.single('profilePicture'), uploadProfilePicture);

// @desc    Delete user account
// @route   DELETE /api/user/delete
// @access  Private
router.delete('/delete', deleteAccount);

export default router;
