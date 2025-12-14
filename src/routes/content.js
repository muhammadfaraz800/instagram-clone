/**
 * Content Routes
 * Routes for uploading images and reels
 */
import { Router } from 'express';
import { verifyToken } from '../utils/jwtUtils.js';
import {
    uploadImage,
    uploadReel,
    getUploadLimits,
    uploadImageMiddleware,
    uploadReelMiddleware,
    deleteContent
} from '../controllers/contentUploadController.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Get upload limits for current user
router.get('/limits', getUploadLimits);

// Upload image (POST /api/content/upload-image)
router.post('/upload-image', uploadImageMiddleware.single('image'), uploadImage);

// Upload reel (POST /api/content/upload-reel)
router.post('/upload-reel', uploadReelMiddleware.single('reel'), uploadReel);

// Delete content (DELETE /api/content/:contentId)
router.delete('/:contentId', deleteContent);

export default router;
