import express from 'express';
import { updateUser } from '../controllers/userController.js';

const router = express.Router();

// @desc    Update user
// @route   PUT /api/user/update
// @access  Private
router.put('/update', updateUser);

export default router;
