import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { execFileSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const languageNames: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese',
  de: 'German',
  th: 'Thai',
};

const createFallbackTranslation = (text: string, targetLang: string) => {
  const label = languageNames[targetLang] || targetLang;
  return `[${label}] ${text}`;
};

const createSilentAudioBuffer = (durationSeconds = 0.6) => {
  try {
    return execFileSync(ffmpegInstaller.path, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=44100:cl=mono',
      '-t',
      String(Math.max(0.25, Math.min(durationSeconds, 30))),
      '-q:a',
      '9',
      '-acodec',
      'libmp3lame',
      '-f',
      'mp3',
      'pipe:1',
    ]);
  } catch (error) {
    console.error('Fallback TTS generation failed:', error);
    return Buffer.alloc(0);
  }
};

export class TranslateService {
  /**
   * Gọi Gemini để dịch danh sách Subtitles sang ngôn ngữ mục tiêu
   */
  static async translateSubtitles(subtitles: any[], targetLang: string, style = 'natural') {
    const ai = getGeminiClient();
    if (!ai) {
      return subtitles.map((subtitle) => ({
        ...subtitle,
        translatedText: createFallbackTranslation(subtitle.text, targetLang),
      }));
    }

    try {
      const texts = subtitles.map((s, index) => `${index}::${s.text}`).join('\n');
      const styleGuide: Record<string, string> = {
        natural: 'natural, fluent and easy to understand',
        formal: 'formal and polished',
        conversational: 'conversational and friendly',
        cinematic: 'cinematic, emotionally expressive and subtitle-friendly',
      };
      
      const prompt = `Translate the following subtitle lines to ${languageNames[targetLang] || targetLang}. Use a ${styleGuide[style] || styleGuide.natural} style. Preserve the index formatting exactly as "index::translated_text". Keep translations concise so they fit subtitle timing.\n\n${texts}`;
      
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
        translatedText: translatedMap.get(index) || createFallbackTranslation(s.text, targetLang),
      }));
    } catch (error) {
      console.error('Translation error:', error);
      if (process.env.AI_ALLOW_FALLBACK === 'false') throw error;
      return subtitles.map((subtitle) => ({
        ...subtitle,
        translatedText: createFallbackTranslation(subtitle.text, targetLang),
      }));
    }
  }

  /**
   * Gọi ElevenLabs Text-to-Speech
   * Trả về stream âm thanh dạng Buffer
   */
  static async generateSpeech(
    text: string,
    voiceId = '21m00Tcm4TlvDq8ikWAM',
    options?: { durationSeconds?: number; speed?: number; volume?: number }
  ) {
    if (!ELEVENLABS_API_KEY) {
      return createSilentAudioBuffer(options?.durationSeconds);
    }

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
            style: options?.speed ? Math.max(0, Math.min((options.speed - 1) * 0.5, 1)) : 0,
          }
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      if (process.env.AI_ALLOW_FALLBACK === 'false') throw error;
      return createSilentAudioBuffer(options?.durationSeconds);
    }
  }
}
