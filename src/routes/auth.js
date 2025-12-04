import express from 'express';
import { signup, login, getMe } from '../controllers/authController.js';
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

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', verifyToken, getMe);

export default router;
