import express from 'express';
import { updateUser, getSettings, deleteAccount, searchUsers } from '../controllers/userController.js';
import { upload, uploadProfilePicture, removeProfilePicture } from '../controllers/uploadController.js';
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

// @desc    Search for users
// @route   GET /api/user/search
// @access  Private (due to router.use(verifyToken))
router.get('/search', searchUsers);


// @desc    Upload profile picture
// @route   POST /api/user/upload-pfp
// @access  Private
router.post('/upload-pfp', upload.single('profilePicture'), uploadProfilePicture);

// @desc    Remove profile picture (reset to default)
// @route   DELETE /api/user/remove-pfp
// @access  Private
router.delete('/remove-pfp', removeProfilePicture);

// @desc    Delete user account
// @route   DELETE /api/user/delete
// @access  Private
router.delete('/delete', deleteAccount);

export default router;
