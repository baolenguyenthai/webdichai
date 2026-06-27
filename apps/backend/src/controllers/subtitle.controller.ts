import { Request, Response } from 'express';
import { SubtitleService } from '../services/subtitle.service';

export class SubtitleController {
  static async getProjectSubtitles(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('projectId is required');
      }
      const subtitles = await SubtitleService.getSubtitles(projectId);
      res.status(200).json({ status: 'success', data: subtitles });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async updateSubtitle(req: Request, res: Response) {
    try {
      const subtitle = await SubtitleService.updateSubtitle(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: subtitle });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async deleteSubtitle(req: Request, res: Response) {
    try {
      await SubtitleService.deleteSubtitle(req.params.id);
      res.status(200).json({ status: 'success', message: 'Deleted' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async addSubtitle(req: Request, res: Response) {
    try {
      const { projectId, text, startTime, endTime } = req.body;
      const subtitle = await SubtitleService.createSubtitle(projectId, { text, startTime, endTime });
      res.status(201).json({ status: 'success', data: subtitle });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
