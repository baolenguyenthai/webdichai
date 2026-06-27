import { GoogleGenAI } from '@google/genai';

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const cleanJsonResponse = (value: string) =>
  value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

const createFallbackTranscript = (durationSeconds = 30) => {
  const safeDuration = Math.max(6, Math.min(durationSeconds || 30, 600));
  const segmentLength = safeDuration <= 20 ? 4 : 6;
  const segmentCount = Math.max(1, Math.ceil(safeDuration / segmentLength));

  return Array.from({ length: segmentCount }, (_, index) => {
    const startTime = Number((index * segmentLength).toFixed(2));
    const endTime = Number(Math.min((index + 1) * segmentLength, safeDuration).toFixed(2));
    return {
      text:
        index === 0
          ? 'AI transcript fallback: configure GEMINI_API_KEY for real speech to text.'
          : `Generated subtitle segment ${index + 1}.`,
      startTime,
      endTime,
    };
  });
};

const inferLanguageFromText = (text: string) => {
  const sample = text.toLowerCase();
  if (/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(sample)) {
    return 'vi';
  }
  if (/[\u3040-\u30ff]/.test(sample)) return 'ja';
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh';
  if (/\b(le|la|les|des|bonjour|merci)\b/.test(sample)) return 'fr';
  if (/\b(el|la|los|hola|gracias)\b/.test(sample)) return 'es';
  return 'en';
};

export class AIService {
  /**
   * Gọi Gemini 2.5 Flash API để chuyển đổi Audio thành Text (kèm thời gian)
   * Trả về mảng Subtitles
   */
  static async transcribeAudio(
    audioPath: string,
    durationSeconds?: number
  ): Promise<Array<{ text: string; startTime: number; endTime: number }>> {
    const ai = getGeminiClient();
    if (!ai) {
      console.warn('[AI] GEMINI_API_KEY is missing. Using transcript fallback.');
      return createFallbackTranscript(durationSeconds);
    }

    let file = null;
    try {
      // 1. Tải file âm thanh lên Google File API
      file = await ai.files.upload({
        file: audioPath,
        config: { mimeType: 'audio/mp3' },
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

      jsonStr = cleanJsonResponse(jsonStr);

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
      if (process.env.AI_ALLOW_FALLBACK === 'false') throw error;
      return createFallbackTranscript(durationSeconds);
    } finally {
      // 3. Xóa file khỏi hệ thống của Google sau khi xử lý xong
      if (file && file.name) {
        ai.files.delete({ name: file.name }).catch(console.error);
      }
    }
  }

  static async detectLanguage(subtitles: Array<{ text: string }>) {
    const mergedText = subtitles.map((subtitle) => subtitle.text).join('\n').slice(0, 4000);
    const fallback = inferLanguageFromText(mergedText);
    const ai = getGeminiClient();

    if (!ai || !mergedText.trim()) return fallback;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Detect the primary spoken language of this transcript. Return only the ISO 639-1 code, for example "en", "vi", "ja", "ko", "fr", "es", or "zh".\n\n${mergedText}`,
      });

      const detected = (response.text || '').trim().toLowerCase().match(/[a-z]{2}/)?.[0];
      return detected || fallback;
    } catch (error) {
      console.error('Language detection error:', error);
      return fallback;
    }
  }
}
