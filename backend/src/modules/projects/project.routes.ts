import { Router } from 'express';
import { createProject, getProjects, getProjectById } from './project.controller';
import { getMyInvitations, acceptInvitation, rejectInvitation } from './project-invitation.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

const router = Router();

router.post('/', authenticateUser, authorizeRoles('owner'), createProject);
router.get('/', authenticateUser, getProjects);
router.get('/:id', authenticateUser, getProjectById);

// Invitation routes
router.get('/invitations/me', authenticateUser, getMyInvitations);
router.post('/invitations/:id/accept', authenticateUser, acceptInvitation);
router.post('/invitations/:id/reject', authenticateUser, rejectInvitation);

export default router;

