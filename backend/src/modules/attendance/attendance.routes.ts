import { Router } from 'express';
import { checkIn, checkOut, getAttendanceByProject } from './attendance.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

router.post(
  '/checkin',
  authenticateUser,
  authorizePermission('canMarkAttendance'),
  checkIn
);
router.post(
  '/checkout',
  authenticateUser,
  authorizePermission('canMarkAttendance'),
  checkOut
);
router.get(
  '/project/:projectId',
  authenticateUser,
  getAttendanceByProject
);

export default router;

