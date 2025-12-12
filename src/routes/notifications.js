import express from 'express';
import {
    getRequests,
    acceptRequest,
    rejectRequest
} from '../controllers/notificationsController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// @desc    Get pending follow requests
// @route   GET /api/notifications/requests
// @access  Private
router.get('/requests', getRequests);

// @desc    Accept a follow request
// @route   POST /api/notifications/requests/:username/accept
// @access  Private
router.post('/requests/:username/accept', acceptRequest);

// @desc    Reject a follow request
// @route   POST /api/notifications/requests/:username/reject
// @access  Private
router.post('/requests/:username/reject', rejectRequest);

export default router;
