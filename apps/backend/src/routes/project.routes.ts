import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Tất cả route project đều yêu cầu xác thực
router.use(authenticate);

router.post('/upload', upload.single('video'), ProjectController.uploadVideo);
router.post('/import', ProjectController.importFromUrl);
router.get('/stats/dashboard', ProjectController.getDashboardStats);
router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProject);
router.patch('/:id', ProjectController.updateProject);
router.post('/:id/translate', ProjectController.translateProject);
router.post('/:id/export', ProjectController.exportProject);
router.post('/:id/retry', ProjectController.retryProject);
router.post('/:id/restore', ProjectController.restoreProject);
router.get('/:id/download/video', ProjectController.downloadVideo);
router.get('/:id/download/subtitle', ProjectController.downloadSubtitle);
router.get('/:id/download/audio', ProjectController.downloadAudio);
router.delete('/:id/trash', ProjectController.trashProject);
router.delete('/:id', ProjectController.deleteProject);

export default router as Router;
