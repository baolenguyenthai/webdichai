import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { addVideoProcessingJob } from '../queues/video.queue';

export class ProjectController {
  static async uploadVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) throw new Error('No file uploaded');

      // Multer-storage-cloudinary sẽ gán URL vào file.path
      const videoUrl = file.path;
      
      const project = await ProjectService.createProject(req.userId!, {
        name: req.body.name || 'Untitled Project',
        videoUrl,
        folderId: req.body.folderId,
      });

      // Đưa job vào Queue
      await addVideoProcessingJob(project.id, videoUrl);

      res.status(201).json({ status: 'success', data: project });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async importFromUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.createProject(req.userId!, {
        name: req.body.name || 'Untitled Project',
        videoUrl: req.body.url,
      });
      
      // Đưa job vào Queue
      await addVideoProcessingJob(project.id, req.body.url);

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

  static async translateProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { targetLang } = req.body;
      if (!targetLang) throw new Error('targetLang is required');
      
      const { addTranslateJob } = require('../queues/translate.queue');
      await addTranslateJob(req.params.id, targetLang);
      
      res.status(200).json({ status: 'success', message: 'Translation job queued' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async exportProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { addExportJob } = require('../queues/export.queue');
      await addExportJob(req.params.id);
      
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

      await addVideoProcessingJob(project.id, project.videoUrl);

      res.status(200).json({ status: 'success', message: 'Project queued for retry' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
