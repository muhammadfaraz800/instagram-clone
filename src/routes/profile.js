import express from 'express';
import {
    getProfile,
    getProfilePosts,
    followUser,
    unfollowUser,
    getFollowStatus
} from '../controllers/profileController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// @desc    Get user profile data
// @route   GET /api/profile/:username
// @access  Private
router.get('/:username', getProfile);

// @desc    Get user posts
// @route   GET /api/profile/:username/posts
// @access  Private
router.get('/:username/posts', getProfilePosts);

// @desc    Follow a user
// @route   POST /api/profile/:username/follow
// @access  Private
router.post('/:username/follow', followUser);

// @desc    Unfollow a user
// @route   DELETE /api/profile/:username/follow
// @access  Private
router.delete('/:username/follow', unfollowUser);

// @desc    Get follow status
// @route   GET /api/profile/:username/follow-status
// @access  Private
router.get('/:username/follow-status', getFollowStatus);

export default router;
