import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export const generateSalt = () => crypto.randomBytes(128).toString('base64');

export const authentication = (salt: string, password: string): string => {
    return crypto.createHmac('sha256', [salt, password].join('/')).update(process.env.SECRET_SALT).digest('hex');
};
