import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import profileRoutes from './profile.js';
import notificationRoutes from './notifications.js';
import verificationRoutes from './verification.js';
import contentRoutes from './content.js';
import reelsRoutes from './reels.js';
import actionsRoutes from './actions.js';

const router = express.Router();

// Mount routes
// Since the main app mounts this router at /api, these will be /api/signup, /api/login, /api/update
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/profile', profileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/verification', verificationRoutes);
router.use('/content', contentRoutes);
router.use('/reels', reelsRoutes);
router.use('/actions', actionsRoutes);

export default router;

