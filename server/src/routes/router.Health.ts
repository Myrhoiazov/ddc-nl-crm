import express from 'express';
import { healthController } from '../controllers/controller.Health';

const router = express.Router();

router.get('/', healthController);

export default router;
