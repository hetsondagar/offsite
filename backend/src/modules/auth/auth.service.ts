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
      phone: user.phone,
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
    phone?: string;
    role: UserRole;
  };
}> => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      throw new AppError('User with this email already exists. Please login instead.', 409, 'USER_EXISTS');
    }
    
    // Create new user
    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role,
      phone: phone ? phone.trim() : undefined,
      assignedProjects: [],
      isActive: true,
    });
    
    try {
      await user.save();
    } catch (error: any) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new AppError(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 409, 'DUPLICATE_ENTRY');
      }
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
        throw new AppError(`Validation error: ${messages}`, 400, 'VALIDATION_ERROR');
      }
      // Re-throw as AppError for better handling
      throw new AppError(`Failed to create user: ${error.message}`, 500, 'USER_CREATION_ERROR');
    }
    
    // Generate tokens
    try {
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
          phone: user.phone,
          role: user.role,
        },
      };
    } catch (error: any) {
      throw new AppError(`Failed to generate authentication tokens: ${error.message}`, 500, 'TOKEN_GENERATION_ERROR');
    }
  } catch (error: any) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      throw error;
    }
    // Otherwise wrap it
    throw new AppError(`Signup failed: ${error.message}`, 500, 'SIGNUP_ERROR');
  }
};

