import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';
import { ensureTempDirs, hasCloudinaryConfig, safeFileName, uploadDir } from '../utils/media';

ensureTempDirs();

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ai-video-translator/projects',
    resource_type: 'auto',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav'],
  } as any,
});

const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureTempDirs();
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'mp4';
    cb(null, `${Date.now()}-${safeFileName(file.originalname.replace(/\.[^.]+$/, ''))}.${ext}`);
  },
});

export const upload = multer({
  storage: hasCloudinaryConfig() ? cloudinaryStorage : localStorage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 1024) * 1024 * 1024,
    files: 10,
  },
});
