import express from 'express';
import { signup, login } from '../controllers/authController.js';

const router = express.Router();

// @desc    Signup
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', signup);

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

export default router;
