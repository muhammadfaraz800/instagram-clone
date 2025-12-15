/**
 * Explore Routes
 * Routes for the explore page API
 */
import express from 'express';
import { getExploreGrid, getPostDetails, getPostComments, getCommentReplies } from '../controllers/exploreController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// @desc    Get explore grid items (mixed images and reels)
// @route   GET /api/explore/grid
// @access  Private
router.get('/grid', getExploreGrid);

// @desc    Get post details for modal view
// @route   GET /api/explore/post/:contentId
// @access  Private
router.get('/post/:contentId', getPostDetails);

// @desc    Get comments for a post
// @route   GET /api/explore/post/:contentId/comments
// @access  Private
router.get('/post/:contentId/comments', getPostComments);

// @desc    Get replies to a specific comment
// @route   GET /api/explore/comments/:commentId/replies
// @access  Private
router.get('/comments/:commentId/replies', getCommentReplies);

export default router;
