import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import cloudinary from '../config/cloudinary';

export const tempDir = path.join(__dirname, '../../temp');
export const uploadDir = path.join(tempDir, 'uploads');

export const ensureTempDirs = () => {
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
};

export const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

export const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );

export const toPublicTempUrl = (filePath: string) => {
  const relative = path.relative(tempDir, filePath).split(path.sep).join('/');
  return `/temp/${relative}`;
};

export const fromPublicTempUrl = (publicUrl: string) => {
  const relative = publicUrl.replace(/^\/temp\/?/, '');
  return path.join(tempDir, relative);
};

export const resolveLocalMediaPath = (value: string) => {
  if (value.startsWith('/temp/')) return fromPublicTempUrl(value);
  if (path.isAbsolute(value) && fs.existsSync(value)) return value;
  return null;
};

export const normalizeImportUrl = (input: string) => {
  const raw = input.trim();
  if (!raw) return raw;

  try {
    const url = new URL(raw);

    if (/drive\.google\.com$/i.test(url.hostname)) {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = fileMatch?.[1] || url.searchParams.get('id');
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    if (/dropbox\.com$/i.test(url.hostname)) {
      url.searchParams.set('dl', '1');
      return url.toString();
    }

    if (/1drv\.ms$/i.test(url.hostname) || /onedrive\.live\.com$/i.test(url.hostname)) {
      return raw;
    }

    return raw;
  } catch {
    return raw;
  }
};

export const safeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'video';

export const downloadToTempFile = async (
  url: string,
  outputPath: string,
  onProgress?: (percent: number) => void
) => {
  ensureTempDirs();
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    maxRedirects: 10,
    timeout: 120000,
    headers: {
      'User-Agent': 'WebDichAI/1.0',
    },
  });

  const total = Number(response.headers['content-length'] || 0);
  let downloaded = 0;
  response.data.on('data', (chunk: Buffer) => {
    downloaded += chunk.length;
    if (total > 0 && onProgress) {
      onProgress(Math.min(100, Math.floor((downloaded / total) * 100)));
    }
  });

  await pipeline(response.data, fs.createWriteStream(outputPath));
  onProgress?.(100);
  return outputPath;
};

export const publishVideoFile = async (filePath: string, projectId: string) => {
  if (!hasCloudinaryConfig()) return toPublicTempUrl(filePath);

  const uploadResult = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: 'ai-video-translator/exports',
    public_id: `${projectId}_final_${Date.now()}`,
    overwrite: true,
  });

  return uploadResult.secure_url;
};

export const getPublicDownloadUrl = (value: string, apiBaseUrl?: string) => {
  if (!value.startsWith('/temp/')) return value;
  const baseUrl = apiBaseUrl || process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}${value}`;
};
