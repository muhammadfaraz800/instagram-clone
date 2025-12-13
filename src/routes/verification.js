import express from 'express';
import { applyForVerification, getVerificationStatus, uploadVerificationDoc } from '../controllers/verificationController.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// @desc    Apply for verification
// @route   POST /api/verification/apply
router.post('/apply', uploadVerificationDoc.single('document'), applyForVerification);

// @desc    Get verification status
// @route   GET /api/verification/status
router.get('/status', getVerificationStatus);

export default router;
