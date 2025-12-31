import { User } from '../users/user.model';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { JWTPayload, UserRole } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

export const login = async (
  email: string,
  password: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}> => {
  // Find user by email and include password field
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }
  
  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  
  const payload: JWTPayload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const signup = async (
  email: string,
  password: string,
  name: string,
  role: UserRole,
  phone?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}> => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  
  if (existingUser) {
    throw new AppError('User with this email already exists. Please login instead.', 409, 'USER_EXISTS');
  }
  
  // Create new user
  const user = new User({
    email,
    password,
    name,
    role,
    phone,
    assignedProjects: [],
    isActive: true,
  });
  
  await user.save();
  
  // Generate tokens
  const payload: JWTPayload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

