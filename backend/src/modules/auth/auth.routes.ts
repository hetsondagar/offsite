import { Router } from 'express';
import {
  loginController,
  verifyOTPController,
  signupController,
  logoutController,
} from './auth.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/login', loginController);
router.post('/verify-otp', verifyOTPController);
router.post('/signup', signupController);
router.post('/logout', authenticateUser, logoutController);

export default router;

