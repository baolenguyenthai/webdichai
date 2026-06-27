import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  /**
   * Gọi OpenAI Whisper API để chuyển đổi Audio thành Text (kèm thời gian)
   * Trả về mảng Subtitles
   */
  static async transcribeAudio(audioPath: string): Promise<Array<{ text: string, startTime: number, endTime: number }>> {
    try {
      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'], // Yêu cầu trả về các segments có thời gian
      });

      // parse the segments
      const segments = (response as any).segments;
      if (!segments || !Array.isArray(segments)) {
        throw new Error('Invalid response from Whisper API');
      }

      return segments.map((seg: any) => ({
        text: seg.text,
        startTime: seg.start,
        endTime: seg.end,
      }));
    } catch (error) {
      console.error('Whisper API Error:', error);
      throw error;
    }
  }
}
