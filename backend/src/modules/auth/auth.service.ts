import { User } from '../users/user.model';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { JWTPayload, UserRole } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

// Mock OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

export const generateOTP = (phone: string): string => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  otpStore.set(phone, { otp, expiresAt });
  
  // In production, send OTP via SMS service
  console.log(`OTP for ${phone}: ${otp}`); // Remove in production
  
  return otp;
};

export const verifyOTP = (phone: string, otp: string): boolean => {
  const stored = otpStore.get(phone);
  
  if (!stored) {
    return false;
  }
  
  if (new Date() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  
  if (stored.otp !== otp) {
    return false;
  }
  
  otpStore.delete(phone);
  return true;
};

export const login = async (phone: string): Promise<{ otp: string }> => {
  // Check if user exists
  const user = await User.findOne({ phone });
  
  if (!user) {
    throw new AppError('User not found. Please sign up first.', 404, 'USER_NOT_FOUND');
  }
  
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }
  
  const otp = generateOTP(phone);
  return { otp };
};

export const verifyOTPAndLogin = async (
  phone: string,
  otp: string,
  role?: UserRole
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
  };
}> => {
  if (!verifyOTP(phone, otp)) {
    throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
  }
  
  const user = await User.findOne({ phone });
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // If role is provided, update user role (for signup flow)
  if (role && user.role !== role) {
    user.role = role;
    await user.save();
  }
  
  const payload: JWTPayload = {
    userId: user._id.toString(),
    role: user.role,
    phone: user.phone,
  };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  };
};

export const signup = async (
  phone: string,
  name: string,
  role: UserRole
): Promise<{ otp: string }> => {
  // Check if user already exists
  const existingUser = await User.findOne({ phone });
  
  if (existingUser) {
    throw new AppError('User already exists. Please login instead.', 409, 'USER_EXISTS');
  }
  
  // Create new user
  const user = new User({
    phone,
    name,
    role,
    assignedProjects: [],
    isActive: true,
  });
  
  await user.save();
  
  const otp = generateOTP(phone);
  return { otp };
};

