import express, { Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, isToken, requireStaff } from '../auth/auth.middleware';
import {
    archiveBrand, createBrand, getBranches, getBranchById, createBranch, updateBranch, deleteBranch,
    getBrands, getOrganization, syncOrganizationFromMollie, updateBrand, upsertOrganization,
} from './company.controller';
import { ROOT_DIR } from '../../common/utils/paths';

const router = express.Router();
const brandUploadDir = path.resolve(ROOT_DIR, 'public/upload/brands');
fs.mkdirSync(brandUploadDir, { recursive: true });
const brandUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, brandUploadDir),
        filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Поддерживаются только PNG, JPG и WebP')),
});
const uploadBrandLogo = (req: Request, res: Response, next: express.NextFunction) => {
    brandUpload.single('file')(req, res, (error) => {
        if (!error) return next();
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Логотип должен быть меньше 3 МБ' });
        }
        return res.status(400).json({ message: error.message || 'Не удалось загрузить логотип' });
    });
};

router.get('/branches', asyncHandler(isToken), requireStaff, asyncHandler(getBranches));
router.get('/branches/:id', asyncHandler(isToken), requireStaff, asyncHandler(getBranchById));
router.post('/branches', asyncHandler(isToken), requireStaff, asyncHandler(createBranch));
router.put('/branches/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateBranch));
router.delete('/branches/:id', asyncHandler(isToken), requireStaff, asyncHandler(deleteBranch));
router.get('/organization', asyncHandler(isToken), requireStaff, asyncHandler(getOrganization));
router.put('/organization', asyncHandler(isToken), requireStaff, asyncHandler(upsertOrganization));
router.post('/organization/sync-mollie', asyncHandler(isToken), requireStaff, asyncHandler(syncOrganizationFromMollie));
router.get('/brands', asyncHandler(isToken), requireStaff, asyncHandler(getBrands));
router.post('/brands', asyncHandler(isToken), requireStaff, asyncHandler(createBrand));
router.put('/brands/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateBrand));
router.delete('/brands/:id', asyncHandler(isToken), requireStaff, asyncHandler(archiveBrand));
router.post('/brands/upload', asyncHandler(isToken), requireStaff, uploadBrandLogo, asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: 'Логотип не загружен' });
    return res.json({ url: `/upload/brands/${req.file.filename}` });
}));

export default router;
