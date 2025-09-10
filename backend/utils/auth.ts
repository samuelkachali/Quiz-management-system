import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../src/types';

const JWT_SECRET_RAW = process.env.JWT_SECRET;

if (!JWT_SECRET_RAW) {
  console.error('❌ JWT_SECRET environment variable is not set!');
  throw new Error('JWT_SECRET environment variable is required');
}

// At this point, JWT_SECRET_RAW is guaranteed to be a string
const JWT_SECRET: string = JWT_SECRET_RAW;

export const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
