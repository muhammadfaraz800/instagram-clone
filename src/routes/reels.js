/**
 * Reels Routes
 * Routes for the reels page API
 */
import express from 'express';
import { getReelsFeed, getReelById, getReelLikes, getReelComments } from '../controllers/reelsController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// @desc    Get reels feed for the reels page
// @route   GET /api/reels/feed
// @access  Private
router.get('/feed', getReelsFeed);

// @desc    Get a specific reel by ID
// @route   GET /api/reels/:contentId
// @access  Private
router.get('/:contentId', getReelById);

// @desc    Get likes for a reel
// @route   GET /api/reels/:contentId/likes
// @access  Private
router.get('/:contentId/likes', getReelLikes);

// @desc    Get comments for a reel
// @route   GET /api/reels/:contentId/comments
// @access  Private
router.get('/:contentId/comments', getReelComments);

export default router;
