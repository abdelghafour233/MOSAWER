export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeneratedImage {
  id: string;
  originalUrl: string;
  generatedUrl: string;
  prompt: string;
  timestamp: number;
}

export interface GenerationResult {
  imageUrl?: string;
  error?: string;
}

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}