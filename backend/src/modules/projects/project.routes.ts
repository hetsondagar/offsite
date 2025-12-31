import { Router } from 'express';
import { createProject, getProjects, getProjectById } from './project.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

const router = Router();

router.post('/', authenticateUser, authorizeRoles('owner'), createProject);
router.get('/', authenticateUser, getProjects);
router.get('/:id', authenticateUser, getProjectById);

export default router;

