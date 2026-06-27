import { Router } from 'express';
import { SubtitleController } from '../controllers/subtitle.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', SubtitleController.getProjectSubtitles);
router.post('/', SubtitleController.addSubtitle);
router.patch('/:id', SubtitleController.updateSubtitle);
router.delete('/:id', SubtitleController.deleteSubtitle);

export default router as Router;
