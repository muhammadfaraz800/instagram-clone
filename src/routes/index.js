import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import profileRoutes from './profile.js';
import notificationRoutes from './notifications.js';

const router = express.Router();

// Mount routes
// Since the main app mounts this router at /api, these will be /api/signup, /api/login, /api/update
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/profile', profileRoutes);
router.use('/notifications', notificationRoutes);

export default router;

