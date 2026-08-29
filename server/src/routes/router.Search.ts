import express from 'express';
import { asyncHandler, isToken } from '../middlewares/middleware.Auth';
import { searchRateLimit } from '../middlewares/middleware.SearchRateLimit';
import { searchController } from '../controllers/controller.Search';

const router = express.Router();

router.get('/', asyncHandler(isToken), searchRateLimit, asyncHandler(searchController));

export default router;
