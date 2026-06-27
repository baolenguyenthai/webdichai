import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export class TranslateService {
  /**
   * Gọi Gemini để dịch danh sách Subtitles sang ngôn ngữ mục tiêu
   */
  static async translateSubtitles(subtitles: any[], targetLang: string) {
    try {
      const texts = subtitles.map((s, index) => `${index}::${s.text}`).join('\n');
      
      const prompt = `Translate the following text to ${targetLang}. Preserve the index formatting exactly as "index::translated_text".\n\n${texts}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const translatedContent = response.text || '';
      
      // Parse lại
      const translatedMap = new Map();
      translatedContent.split('\n').forEach(line => {
        const parts = line.split('::');
        if (parts.length >= 2) {
          const idx = parseInt(parts[0], 10);
          const translatedText = parts.slice(1).join('::').trim();
          if (!isNaN(idx)) {
            translatedMap.set(idx, translatedText);
          }
        }
      });

      // Update the original array with translations
      return subtitles.map((s, index) => ({
        ...s,
        translatedText: translatedMap.get(index) || s.text,
      }));
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Gọi ElevenLabs Text-to-Speech
   * Trả về stream âm thanh dạng Buffer
   */
  static async generateSpeech(text: string, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    try {
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        data: {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          }
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }
}
