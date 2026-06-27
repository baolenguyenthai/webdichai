import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export class AIService {
  /**
   * Gọi Gemini 2.5 Flash API để chuyển đổi Audio thành Text (kèm thời gian)
   * Trả về mảng Subtitles
   */
  static async transcribeAudio(audioPath: string): Promise<Array<{ text: string, startTime: number, endTime: number }>> {
    let file = null;
    try {
      // 1. Tải file âm thanh lên Google File API
      file = await ai.files.upload({
        file: audioPath,
        mimeType: 'audio/mp3', // Hoặc type tương ứng
      });

      console.log(`[Gemini] Đã upload audio: ${file.name}`);

      // 2. Yêu cầu bóc băng bằng Gemini 2.5 Flash
      const prompt = `You are a highly accurate transcription AI. Transcribe the spoken words in this audio exactly as they are spoken. You MUST output a pure JSON array containing the transcription. Each object in the array should represent a short phrase or sentence and MUST have these exact properties: "text" (string), "startTime" (number in seconds), and "endTime" (number in seconds). Output ONLY the raw JSON array. Do not include any markdown syntax or explanations.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      let jsonStr = response.text;
      if (!jsonStr) throw new Error("Empty response from Gemini");

      // Xử lý loại bỏ markdown block nếu Gemini vẫn trả về
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '');
      }

      const subtitles = JSON.parse(jsonStr);
      
      if (!Array.isArray(subtitles)) {
        // Nếu nó trả về dạng object chứa array
        for (const key in subtitles) {
          if (Array.isArray(subtitles[key])) return subtitles[key];
        }
        throw new Error("Invalid output format: not an array");
      }

      return subtitles;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    } finally {
      // 3. Xóa file khỏi hệ thống của Google sau khi xử lý xong
      if (file && file.name) {
        ai.files.delete({ name: file.name }).catch(console.error);
      }
    }
  }
}
