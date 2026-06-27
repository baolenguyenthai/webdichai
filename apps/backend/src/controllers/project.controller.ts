import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { addVideoProcessingJob } from '../queues/video.queue';
import { SubtitleService } from '../services/subtitle.service';
import {
  fromPublicTempUrl,
  isRemoteUrl,
  normalizeImportUrl,
  resolveLocalMediaPath,
  toPublicTempUrl,
} from '../utils/media';
import fs from 'fs';
import path from 'path';

const boolFromBody = (value: any, defaultValue: boolean) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  return value !== 'false';
};

const publicUploadUrl = (filePath: string) => {
  if (isRemoteUrl(filePath)) return filePath;
  return toPublicTempUrl(filePath);
};

export class ProjectController {
  static async uploadVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) throw new Error('No file uploaded');

      // Multer-storage-cloudinary sẽ gán URL vào file.path
      const videoUrl = publicUploadUrl(file.path);
      const targetLang = req.body.targetLang || 'vi';
      
      const project = await ProjectService.createProject(req.userId!, {
        name: req.body.name || 'Untitled Project',
        videoUrl,
        folderId: req.body.folderId,
        targetLang,
      });

      // Đưa job vào Queue
      await addVideoProcessingJob(project.id, videoUrl, {
        targetLang,
        translationStyle: req.body.translationStyle || 'natural',
        autoTranslate: boolFromBody(req.body.autoTranslate, true),
        autoExport: boolFromBody(req.body.autoExport, true),
        voice: req.body.voice,
        voiceId: req.body.voiceId,
        speed: Number(req.body.speed || 1),
        pitch: Number(req.body.pitch || 1),
        volume: Number(req.body.volume || 1),
      });

      res.status(201).json({ status: 'success', data: project });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async importFromUrl(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.body.url) throw new Error('url is required');
      const videoUrl = normalizeImportUrl(req.body.url);
      const targetLang = req.body.targetLang || 'vi';
      const project = await ProjectService.createProject(req.userId!, {
        name: req.body.name || 'Untitled Project',
        videoUrl,
        targetLang,
      });
      
      // Đưa job vào Queue
      await addVideoProcessingJob(project.id, videoUrl, {
        targetLang,
        translationStyle: req.body.translationStyle || 'natural',
        autoTranslate: boolFromBody(req.body.autoTranslate, true),
        autoExport: boolFromBody(req.body.autoExport, true),
        voice: req.body.voice,
        voiceId: req.body.voiceId,
        speed: Number(req.body.speed || 1),
        pitch: Number(req.body.pitch || 1),
        volume: Number(req.body.volume || 1),
      });

      res.status(201).json({ status: 'success', data: project });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const projects = await ProjectService.listProjects(req.userId!, req.query);
      res.status(200).json({ status: 'success', data: projects });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await ProjectService.getDashboardStats(req.userId!);
      res.status(200).json({ status: 'success', data: stats });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async getProject(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getProject(req.userId!, req.params.id);
      res.status(200).json({ status: 'success', data: project });
    } catch (error: any) {
      res.status(404).json({ status: 'error', message: error.message });
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.updateProject(req.userId!, req.params.id, req.body);
      res.status(200).json({ status: 'success', data: project });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async trashProject(req: AuthenticatedRequest, res: Response) {
    try {
      await ProjectService.moveToTrash(req.userId!, req.params.id);
      res.status(200).json({ status: 'success', message: 'Project moved to trash' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      await ProjectService.deleteProjectPermanently(req.userId!, req.params.id);
      res.status(200).json({ status: 'success', message: 'Project deleted permanently' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async restoreProject(req: AuthenticatedRequest, res: Response) {
    try {
      await ProjectService.restoreFromTrash(req.userId!, req.params.id);
      res.status(200).json({ status: 'success', message: 'Project restored' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async translateProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { targetLang } = req.body;
      if (!targetLang) throw new Error('targetLang is required');
      
      const { addTranslateJob } = require('../queues/translate.queue');
      await addTranslateJob(req.params.id, targetLang, {
        style: req.body.translationStyle || req.body.style || 'natural',
        autoExport: boolFromBody(req.body.autoExport, false),
        voice: req.body.voice,
        voiceId: req.body.voiceId,
        speed: Number(req.body.speed || 1),
        pitch: Number(req.body.pitch || 1),
        volume: Number(req.body.volume || 1),
      });
      
      res.status(200).json({ status: 'success', message: 'Translation job queued' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async exportProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { addExportJob } = require('../queues/export.queue');
      await addExportJob(req.params.id, {
        container: req.body.container,
        subtitleFormat: req.body.subtitleFormat,
        audioMode: req.body.audioMode,
      });
      
      res.status(200).json({ status: 'success', message: 'Export job queued' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async retryProject(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getProject(req.userId!, req.params.id);
      if (project.status !== 'FAILED') {
        throw new Error('Only FAILED projects can be retried');
      }

      const { prisma } = require('@ai-video-translator/database');
      await prisma.subtitle.deleteMany({ where: { projectId: project.id } });

      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'PENDING' },
      });

      if (!project.videoUrl) {
        throw new Error('Project does not have a video URL');
      }

      await addVideoProcessingJob(project.id, project.videoUrl);

      res.status(200).json({ status: 'success', message: 'Project queued for retry' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async downloadSubtitle(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getProject(req.userId!, req.params.id);
      const format = String(req.query.format || 'srt').toLowerCase();
      if (!['srt', 'ass', 'vtt'].includes(format)) throw new Error('Unsupported subtitle format');

      const content = await SubtitleService.exportSubtitleFile(project.id, format as 'srt' | 'ass' | 'vtt');
      res.setHeader('Content-Type', format === 'vtt' ? 'text/vtt; charset=utf-8' : 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.${format}"`);
      res.send(content);
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async downloadVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getProject(req.userId!, req.params.id);
      if (!project.exportUrl) throw new Error('Exported video is not ready');

      if (isRemoteUrl(project.exportUrl)) {
        return res.redirect(project.exportUrl);
      }

      const filePath = project.exportUrl.startsWith('/temp/')
        ? fromPublicTempUrl(project.exportUrl)
        : resolveLocalMediaPath(project.exportUrl);
      if (!filePath || !fs.existsSync(filePath)) throw new Error('Export file not found');
      res.download(filePath, `${project.name}${path.extname(filePath) || '.mp4'}`);
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async downloadAudio(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getProject(req.userId!, req.params.id);
      const dubPath = path.join(__dirname, '../../temp', `${project.id}_dub.mp3`);
      if (!fs.existsSync(dubPath)) throw new Error('Dub audio is not ready');
      res.download(dubPath, `${project.name}-dub.mp3`);
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
