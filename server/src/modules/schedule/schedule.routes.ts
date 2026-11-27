import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { asyncHandler, isToken, requireStaff } from '../auth/auth.middleware';
import {
    getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
    getGroupManagementStats,
    getHalls, createHall, deleteHall,
    getChoreographers, createChoreographer, updateChoreographer, deleteChoreographer,
    getStyles, getStyleCards, createStyleCard, updateStyleCard, deleteStyleCard,
} from './schedule.controller';
import { ROOT_DIR } from '../../common/utils/paths';

const choreographerUploadDir = path.resolve(ROOT_DIR, 'public/upload/choreographers');
const styleUploadDir = path.resolve(ROOT_DIR, 'public/upload/styles');
fs.mkdirSync(styleUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, choreographerUploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'));
    },
});

const styleStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, styleUploadDir),
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const styleUpload = multer({
    storage: styleStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/')
        ? cb(null, true)
        : cb(new Error('Only images allowed')),
});

const router = express.Router();

// Groups
router.get('/groups-management/stats', asyncHandler(isToken), requireStaff, asyncHandler(getGroupManagementStats));
router.get('/groups', asyncHandler(isToken), requireStaff, asyncHandler(getGroups));
router.get('/groups/:id', asyncHandler(isToken), requireStaff, asyncHandler(getGroupById));
router.post('/groups', asyncHandler(isToken), requireStaff, asyncHandler(createGroup));
router.put('/groups/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateGroup));
router.delete('/groups/:id', asyncHandler(isToken), requireStaff, asyncHandler(deleteGroup));

// Halls
router.get('/halls', asyncHandler(isToken), requireStaff, asyncHandler(getHalls));
router.post('/halls', asyncHandler(isToken), requireStaff, asyncHandler(createHall));
router.delete('/halls/:id', asyncHandler(isToken), requireStaff, asyncHandler(deleteHall));

// Choreographers
router.get('/choreographers', asyncHandler(isToken), requireStaff, asyncHandler(getChoreographers));
router.post('/choreographers', asyncHandler(isToken), requireStaff, asyncHandler(createChoreographer));
router.put('/choreographers/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateChoreographer));
router.delete('/choreographers/:id', asyncHandler(isToken), requireStaff, asyncHandler(deleteChoreographer));

// Photo upload for choreographers
const uploadChoreographerPhoto = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const url = `/upload/choreographers/${req.file.filename}`;
    res.json({ url });
});

router.post('/choreographers/upload', asyncHandler(isToken), requireStaff, upload.single('file'), uploadChoreographerPhoto);

// Styles
router.get('/styles', asyncHandler(isToken), requireStaff, asyncHandler(getStyles));
router.get('/style-cards', asyncHandler(isToken), requireStaff, asyncHandler(getStyleCards));
router.post('/style-cards', asyncHandler(isToken), requireStaff, asyncHandler(createStyleCard));
router.put('/style-cards/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateStyleCard));
router.delete('/style-cards/:id', asyncHandler(isToken), requireStaff, asyncHandler(deleteStyleCard));
router.post('/style-cards/upload', asyncHandler(isToken), requireStaff, styleUpload.single('file'), asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    return res.json({ url: `/upload/styles/${req.file.filename}` });
}));

export default router;
