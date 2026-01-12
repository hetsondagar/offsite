import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload } from '../types';

export const generateAccessToken = (payload: JWTPayload): string => {
  const secret = env.JWT_ACCESS_SECRET as jwt.Secret;
  const expiresIn = env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = env.JWT_REFRESH_SECRET as jwt.Secret;
  const expiresIn = env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET as jwt.Secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET as jwt.Secret) as JWTPayload;
};

