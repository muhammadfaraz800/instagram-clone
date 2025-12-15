/**
 * Feed Routes
 * Routes for home feed, post details, comments, and suggestions
 */

import express from 'express';
import {
    getHomeFeed,
    getPostDetails,
    getPostComments,
    getCommentReplies,
    getSuggestions
} from '../controllers/feedController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// @desc    Get home feed posts
// @route   GET /api/feed
// @access  Private
router.get('/', getHomeFeed);

// @desc    Get post details
// @route   GET /api/feed/post/:contentId
// @access  Private
router.get('/post/:contentId', getPostDetails);

// @desc    Get post comments
// @route   GET /api/feed/post/:contentId/comments
// @access  Private
router.get('/post/:contentId/comments', getPostComments);

// @desc    Get comment replies
// @route   GET /api/feed/comment/:commentId/replies
// @access  Private
router.get('/comment/:commentId/replies', getCommentReplies);

// @desc    Get user suggestions
// @route   GET /api/feed/suggestions
// @access  Private
router.get('/suggestions', getSuggestions);

export default router;
