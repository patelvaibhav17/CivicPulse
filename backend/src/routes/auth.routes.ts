import { Router } from 'express';
import { register, login, getMe, updateProfile, getNotifications, markNotificationRead, clearNotifications, getAllUsers, updateUserRole } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/users', getAllUsers);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:id/read', authMiddleware, markNotificationRead);
router.post('/notifications/clear', authMiddleware, clearNotifications);
router.put('/admin/users/:uid/role', authMiddleware, updateUserRole);

export default router;
