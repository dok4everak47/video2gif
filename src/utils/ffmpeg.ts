import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpeg: FFmpeg | null = null;

async function fetchWithProgress(url: string, onProgress: (p: number) => void): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  
  const contentLength = response.headers.get('content-length');
  if (!contentLength) {
    return response.blob();
  }
  
  const total = parseInt(contentLength, 10);
  let loaded = 0;
  
  const reader = response.body?.getReader();
  if (!reader) return response.blob();
  
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.round((loaded / total) * 100));
  }
  
  const body = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    body.set(chunk, position);
    position += chunk.length;
  }
  
  return new Blob([body]);
}

export async function loadFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(Math.round(progress * 100));
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  onProgress?.(2);
  
  const jsUrl = `${baseURL}/ffmpeg-core.js`;
  const jsBlob = await fetchWithProgress(jsUrl, (p) => onProgress?.(2 + p * 0.25));
  const coreURL = URL.createObjectURL(jsBlob);
  
  onProgress?.(28);
  
  const wasmUrl = `${baseURL}/ffmpeg-core.wasm`;
  const wasmBlob = await fetchWithProgress(wasmUrl, (p) => onProgress?.(28 + p * 0.6));
  const wasmURL = URL.createObjectURL(wasmBlob);
  
  onProgress?.(90);
  
  await ffmpeg.load({
    coreURL,
    wasmURL,
  });
  
  URL.revokeObjectURL(coreURL);
  URL.revokeObjectURL(wasmURL);
  
  onProgress?.(100);

  return ffmpeg;
}

export function getFFmpeg(): FFmpeg | null {
  return ffmpeg;
}

export interface ConversionOptions {
  startTime?: number;
  duration?: number;
  width?: number;
  frameRate?: number;
  quality?: number;
  reverse?: boolean;
  filter?: 'none' | 'grayscale' | 'sepia' | 'blur' | 'brightness' | 'contrast';
  text?: string;
  textPosition?: 'top' | 'bottom';
  textColor?: string;
  textSize?: number;
}

export async function convertVideoToGif(
  videoFile: File,
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ff = await loadFFmpeg(onProgress);
  
  const inputName = 'input.mp4';
  const outputName = 'output.gif';

  const videoData = await videoFile.arrayBuffer();
  await ff.writeFile(inputName, new Uint8Array(videoData));

  const args: string[] = ['-i', inputName];

  if (options.startTime && options.startTime > 0) {
    args.push('-ss', options.startTime.toString());
  }

  if (options.duration && options.duration > 0) {
    args.push('-t', options.duration.toString());
  }

  const frameRate = options.frameRate || 10;
  args.push('-r', frameRate.toString());

  let filterChain = `fps=${frameRate}`;

  if (options.width) {
    filterChain += `,scale=${options.width}:-1:flags=lanczos`;
  } else {
    filterChain += ',scale=480:-1:flags=lanczos';
  }

  // Add filter effects
  if (options.filter && options.filter !== 'none') {
    switch (options.filter) {
      case 'grayscale':
        filterChain += ',format=gray';
        break;
      case 'sepia':
        filterChain += ',colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
        break;
      case 'blur':
        filterChain += ',boxblur=2:1';
        break;
      case 'brightness':
        filterChain += ',eq=brightness=0.15';
        break;
      case 'contrast':
        filterChain += ',eq=contrast=1.3';
        break;
    }
  }

  // Add reverse effect
  if (options.reverse) {
    filterChain += ',reverse';
  }

  // Watermark disabled - FFmpeg.wasm requires external font loading
  // if (options.text && fontLoaded) {
  //   const position = options.textPosition === 'top' ? '10:10' : '10:h-30';
  //   const color = options.textColor || 'white';
  //   const size = options.textSize || 24;
  //   const escapedText = options.text.replace(/'/g, "'").replace(/:/g, '\\:');
  //   filterChain += `,drawtext=fontfile=/fonts/arial.ttf:text='${escapedText}':fontsize=${size}:fontcolor=${color}:x=${position}:shadowcolor=black:shadowx=2:shadowy=2`;
  // }

  args.push('-vf', filterChain);

  args.push('-loop', '0');
  args.push('-g', '1');
  args.push(outputName);

  try {
    await ff.exec(args);
  } catch (err) {
    console.error('FFmpeg exec error:', err);
    throw new Error('转换失败，可能是水印功能不兼容');
  }

  const data = await ff.readFile(outputName);
  
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  if (typeof data === 'string') {
    const bytes = new TextEncoder().encode(data);
    return new Blob([bytes], { type: 'image/gif' });
  }
  
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return new Blob([buffer as unknown as BlobPart], { type: 'image/gif' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
