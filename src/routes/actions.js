/**
 * Actions Routes
 * Routes for likes, comments, and comment likes
 */

import express from 'express';
import {
    likeContent,
    unlikeContent,
    checkUserLikedContent,
    getContentLikes,
    addComment,
    deleteComment,
    getContentComments,
    likeComment,
    unlikeComment,
    getCommentLikes
} from '../controllers/actionsController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// ==================== CONTENT LIKES ====================

// @desc    Like a content
// @route   POST /api/actions/like/:contentId
// @access  Private
router.post('/like/:contentId', likeContent);

// @desc    Unlike a content
// @route   DELETE /api/actions/like/:contentId
// @access  Private
router.delete('/like/:contentId', unlikeContent);

// @desc    Check if user liked content
// @route   GET /api/actions/like/:contentId/check
// @access  Private
router.get('/like/:contentId/check', checkUserLikedContent);

// @desc    Get users who liked content
// @route   GET /api/actions/like/:contentId/users
// @access  Private
router.get('/like/:contentId/users', getContentLikes);

// ==================== COMMENTS ====================

// @desc    Add comment to content (or reply to comment)
// @route   POST /api/actions/comment/:contentId
// @access  Private
router.post('/comment/:contentId', addComment);

// @desc    Delete a comment
// @route   DELETE /api/actions/comment/:actionId
// @access  Private
router.delete('/comment/:actionId', deleteComment);

// @desc    Get comments for content
// @route   GET /api/actions/comment/:contentId
// @access  Private
router.get('/comment/:contentId', getContentComments);

// ==================== COMMENT LIKES ====================

// @desc    Like a comment
// @route   POST /api/actions/comment-like/:commentId
// @access  Private
router.post('/comment-like/:commentId', likeComment);

// @desc    Unlike a comment
// @route   DELETE /api/actions/comment-like/:commentId
// @access  Private
router.delete('/comment-like/:commentId', unlikeComment);

// @desc    Get users who liked a comment
// @route   GET /api/actions/comment-like/:commentId
// @access  Private
router.get('/comment-like/:commentId', getCommentLikes);

export default router;
