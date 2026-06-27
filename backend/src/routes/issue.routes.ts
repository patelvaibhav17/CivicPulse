import { Router } from 'express';
import { getIssues, getIssueById, createIssue, verifyIssue, upvoteIssue, updateIssueStatus, addComment, updateUserRole } from '../controllers/issue.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getIssues);
router.get('/:id', authMiddleware, getIssueById);
router.post('/', authMiddleware, createIssue);
router.put('/:id/verify', authMiddleware, verifyIssue);
router.put('/:id/upvote', authMiddleware, upvoteIssue);
router.put('/:id/status', authMiddleware, updateIssueStatus);
router.post('/:id/comment', authMiddleware, addComment);
router.put('/admin/users/:uid/role', authMiddleware, updateUserRole);

export default router;
