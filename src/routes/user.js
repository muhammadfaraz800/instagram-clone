import express from 'express';
import { updateUser, getSettings } from '../controllers/userController.js';
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

export default router;
