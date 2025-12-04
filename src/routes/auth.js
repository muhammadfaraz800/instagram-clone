import express from 'express';
import { signup, login, getMe, logout } from '../controllers/authController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// @desc    Signup
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', signup);

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', logout);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', verifyToken, getMe);

export default router;
