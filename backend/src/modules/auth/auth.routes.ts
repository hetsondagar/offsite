import { Router } from 'express';
import {
  loginController,
  signupController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
} from './auth.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

// Auth routes
router.post('/login', loginController);
router.post('/signup', signupController);
router.post('/logout', authenticateUser, logoutController);

// Password reset flow
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password/:token', resetPasswordController);

export default router;

