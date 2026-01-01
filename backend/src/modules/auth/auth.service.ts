import { User } from '../users/user.model';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { generateOffsiteId } from '../../utils/generateOffsiteId';
import { JWTPayload, UserRole } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import crypto from 'crypto';
import { sendResetEmail } from '../../utils/mailer';
import { logger } from '../../utils/logger';

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
      offsiteId: user.offsiteId, // Return stored offsiteId (never regenerate)
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
    offsiteId: string;
  };
}> => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      throw new AppError('User with this email already exists. Please login instead.', 409, 'USER_EXISTS');
    }
    
    // Generate OffSite ID ONCE at signup (never regenerated)
    const offsiteId = await generateOffsiteId(role);
    
    // Check for duplicate phone if provided (only check non-empty phones)
    // Phone is completely optional - skip this check if not provided
    const trimmedPhone = phone?.trim();
    if (trimmedPhone && trimmedPhone.length > 0) {
      // Only check for existing users with the same phone number
      // Since we only check when phone is non-empty, this will only match non-empty phones
      const existingUserWithPhone = await User.findOne({ phone: trimmedPhone });
      if (existingUserWithPhone) {
        throw new AppError('Phone number already exists. Please use a different phone number.', 409, 'DUPLICATE_ENTRY');
      }
    }
    
    // Create new user with offsiteId
    // Only include phone if it's provided and not empty
    const userData: any = {
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role,
      offsiteId, // Set once, never changes
      assignedProjects: [],
      isActive: true,
    };
    
    // Only add phone if provided and not empty - completely omit if not provided
    // Phone is completely optional - don't include it in userData if not provided
    if (trimmedPhone && trimmedPhone.length > 0) {
      userData.phone = trimmedPhone;
    }
    // Explicitly do NOT set phone field if not provided (don't set to undefined or empty string)
    
    const user = new User(userData);
    
    try {
      await user.save();
    } catch (error: any) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        // Provide more specific error messages
        if (field === 'email') {
          throw new AppError('Email already exists. Please login instead.', 409, 'DUPLICATE_ENTRY');
        } else if (field === 'offsiteId') {
          throw new AppError('Account creation failed. Please try again.', 409, 'DUPLICATE_ENTRY');
        }
        // Phone field no longer has unique constraint, so this shouldn't happen
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
          offsiteId: user.offsiteId, // Return generated offsiteId
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

/**
 * Forgot password: generates a secure token, stores hashed token and expiry on user,
 * and attempts to send a reset email with the RAW token (not stored).
 * Always resolves successfully (to avoid revealing whether email exists).
 */
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });

  // Always return success to caller; do not reveal existence of user
  if (!user) {
    logger.debug('Password reset requested for unknown email');
    return;
  }

  // Generate token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = expires;

  await user.save();

  // Send email with raw token in the reset link. Swallow email errors.
  try {
    await sendResetEmail(user.email, rawToken);
    logger.info(`Sent password reset email to ${user.email}`);
  } catch (err: any) {
    logger.warn('Failed to send password reset email', err.message || err);
  }
};

/**
 * Reset password using token from URL. Token is hashed and matched against DB.
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password');

  if (!user) {
    throw new AppError('Reset token is invalid or has expired', 400, 'INVALID_TOKEN');
  }

  // Update password (pre-save hook will hash it), and clear reset fields
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();
};

