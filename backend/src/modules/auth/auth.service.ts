import { User } from '../users/user.model';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { generateOffsiteId } from '../../utils/generateOffsiteId';
import { JWTPayload, UserRole } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
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
    phone?: string;
    role: UserRole;
    offsiteId?: string;
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
        } else if (field === 'phone') {
          // If phone wasn't provided but we get a phone duplicate error, it's likely an old database index issue
          if (!trimmedPhone || trimmedPhone.length === 0) {
            logger.error('Phone duplicate error occurred even though phone was not provided. Old unique index may still exist in database. Attempting workaround...', {
              email,
              errorKeyPattern: error.keyPattern,
            });
            
            // Workaround: Use native MongoDB insert to completely bypass Mongoose schema
            // This ensures phone field is not included at all in the document
            try {
              // Get the native MongoDB collection
              const collection = User.collection;
              
              // Hash password manually since we're bypassing Mongoose pre-save hook
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(password, salt);
              
              // Import mongoose for ObjectId
              const mongoose = await import('mongoose');
              
              // Prepare document - CRITICAL: Do NOT include phone field at all
              // Not as null, not as undefined, not as empty string - completely omit it
              const userDoc: any = {
                _id: new mongoose.default.Types.ObjectId(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                name: name.trim(),
                role,
                offsiteId,
                assignedProjects: [],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              // Explicitly ensure phone is NOT in the document
              // Do not set userDoc.phone at all - it should not exist in the object
              
              // Insert directly into collection
              const result = await collection.insertOne(userDoc);
              
              // Fetch the created user using Mongoose to get proper document
              const newUser = await User.findById(result.insertedId);
              
              if (!newUser) {
                throw new Error('Failed to retrieve created user');
              }
              
              logger.info('Successfully created user using native MongoDB insert (phone field omitted)', { 
                email, 
                userId: newUser._id,
                hasPhoneField: 'phone' in newUser.toObject()
              });
              
              // Continue with token generation
              const payload: JWTPayload = {
                userId: newUser._id.toString(),
                role: newUser.role,
                email: newUser.email,
              };
              
              const accessToken = generateAccessToken(payload);
              const refreshToken = generateRefreshToken(payload);
              
              return {
                accessToken,
                refreshToken,
                user: {
                  id: newUser._id.toString(),
                  name: newUser.name,
                  email: newUser.email,
                  phone: newUser.phone,
                  role: newUser.role,
                  offsiteId: newUser.offsiteId,
                },
              };
            } catch (retryError: any) {
              logger.error('Native MongoDB insert workaround failed', {
                email,
                retryError: retryError.message,
                retryErrorCode: retryError.code,
                retryKeyPattern: retryError.keyPattern,
                stack: retryError.stack,
              });
              
              // Provide clear error message
              if (retryError.code === 11000 && retryError.keyPattern?.phone) {
                throw new AppError(
                  'Account creation failed. The database has a unique index on the phone field that prevents creating accounts without a phone number. Please contact your database administrator to drop the index by running: db.users.dropIndex("phone_1") in MongoDB.',
                  409,
                  'DUPLICATE_ENTRY'
                );
              }
              
              throw retryError;
            }
          }
          throw new AppError('Phone number already exists. Please use a different phone number.', 409, 'DUPLICATE_ENTRY');
        }
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

