import { Router } from 'express';
import { createItem } from '../controllers/items.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createItemSchema } from '../validators/items.validator.js';

const router = Router();

router.post('/items', validateBody(createItemSchema), asyncHandler(createItem));

export default router;
