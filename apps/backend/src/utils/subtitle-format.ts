export interface SubtitleLike {
  text: string;
  translatedText?: string | null;
  startTime: number;
  endTime: number;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

export const formatSrtTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hh = Math.floor(safeSeconds / 3600);
  const mm = Math.floor((safeSeconds % 3600) / 60);
  const ss = Math.floor(safeSeconds % 60);
  const ms = Math.floor((safeSeconds % 1) * 1000);
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`;
};

export const formatVttTime = (seconds: number) => formatSrtTime(seconds).replace(',', '.');

export const formatAssTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = Math.floor(safeSeconds % 60);
  const cs = Math.floor((safeSeconds % 1) * 100);
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
};

const subtitleText = (subtitle: SubtitleLike) => (subtitle.translatedText || subtitle.text || '').trim();

export const buildSrt = (subtitles: SubtitleLike[]) =>
  subtitles
    .map(
      (subtitle, index) =>
        `${index + 1}\n${formatSrtTime(subtitle.startTime)} --> ${formatSrtTime(subtitle.endTime)}\n${subtitleText(subtitle)}\n`
    )
    .join('\n');

export const buildVtt = (subtitles: SubtitleLike[]) =>
  `WEBVTT\n\n${subtitles
    .map(
      (subtitle) =>
        `${formatVttTime(subtitle.startTime)} --> ${formatVttTime(subtitle.endTime)}\n${subtitleText(subtitle)}\n`
    )
    .join('\n')}`;

export const buildAss = (subtitles: SubtitleLike[]) => {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,56,&H00FFFFFF,&H000000FF,&H00111111,&H7F000000,0,0,0,0,100,100,0,0,1,3,1,2,80,80,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = subtitles
    .map((subtitle) => {
      const text = subtitleText(subtitle).replace(/\n/g, '\\N').replace(/,/g, '，');
      return `Dialogue: 0,${formatAssTime(subtitle.startTime)},${formatAssTime(subtitle.endTime)},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return `${header}\n${events}\n`;
};

export const buildSubtitleFile = (subtitles: SubtitleLike[], format: 'srt' | 'ass' | 'vtt') => {
  if (format === 'ass') return buildAss(subtitles);
  if (format === 'vtt') return buildVtt(subtitles);
  return buildSrt(subtitles);
};
