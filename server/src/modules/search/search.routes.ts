import express from 'express';
import { asyncHandler, isToken, requireStaff } from '../auth/auth.middleware';
import { searchRateLimit } from './search.rate-limit';
import { searchController } from './search.controller';

const router = express.Router();

router.get('/', asyncHandler(isToken), requireStaff, searchRateLimit, asyncHandler(searchController));

export default router;
