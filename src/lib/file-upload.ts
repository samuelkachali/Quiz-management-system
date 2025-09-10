import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

// File type categories
export type FileType = 'image' | 'document' | 'audio' | 'video' | 'other';

// MIME type groups
const MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
  ],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

// File size limits in bytes
const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 20 * 1024 * 1024, // 20MB
  VIDEO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  DEFAULT: 5 * 1024 * 1024, // 5MB
};

// Bucket names
const BUCKETS = {
  CHAT: 'chat-files',
  AVATARS: 'user-avatars',
} as const;

type BucketName = keyof typeof BUCKETS;

interface UploadOptions {
  bucket?: BucketName;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  public?: boolean;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  url: string;
  path: string;
  type: FileType;
  name: string;
  size: number;
  mimeType: string;
  bucket: string;
}

// Default options for file uploads
const DEFAULT_OPTIONS: UploadOptions = {
  bucket: 'CHAT',
  folder: 'uploads',
  maxSizeMB: 10, // 10MB default limit
  allowedTypes: [
    ...MIME_TYPES.IMAGES,
    ...MIME_TYPES.DOCUMENTS,
    ...MIME_TYPES.AUDIO,
    ...MIME_TYPES.VIDEO,
  ],
  public: true,
};

/**
 * Get the file type based on MIME type or extension
 */
function getFileTypeFromMime(mimeType: string, fileName: string): FileType {
  if (MIME_TYPES.IMAGES.includes(mimeType)) return 'image';
  if (MIME_TYPES.DOCUMENTS.includes(mimeType)) return 'document';
  if (MIME_TYPES.AUDIO.includes(mimeType)) return 'audio';
  if (MIME_TYPES.VIDEO.includes(mimeType)) return 'video';
  
  // Fallback to extension check if MIME type is not specific enough
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'document';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return 'audio';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(extension)) return 'video';
  
  return 'other';
}

/**
 * Get the appropriate file size limit based on file type
 */
function getFileSizeLimit(fileType: FileType): number {
  switch (fileType) {
    case 'image': return FILE_SIZE_LIMITS.IMAGE;
    case 'audio': return FILE_SIZE_LIMITS.AUDIO;
    case 'video': return FILE_SIZE_LIMITS.VIDEO;
    case 'document': return FILE_SIZE_LIMITS.DOCUMENT;
    default: return FILE_SIZE_LIMITS.DEFAULT;
  }
}

/**
 * Validates a file against the specified options
 */
function validateFile(file: File, options: UploadOptions) {
  const fileType = getFileTypeFromMime(file.type, file.name);
  const sizeLimit = options.maxSizeMB ? options.maxSizeMB * 1024 * 1024 : getFileSizeLimit(fileType);
  
  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
  }
  
  // Check file size
  if (file.size > sizeLimit) {
    throw new Error(`File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${formatFileSize(sizeLimit)}`);
  }
  
  return { fileType };
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const supabase = createClientComponentClient();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const bucketName = BUCKETS[mergedOptions.bucket || 'CHAT'];
  
  // Validate the file
  const { fileType } = validateFile(file, mergedOptions);
  
  // Generate a unique filename with original extension
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = mergedOptions.folder ? `${mergedOptions.folder}/${fileName}` : fileName;
  
  // Upload the file with progress tracking
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
  
  return {
    url: publicUrl,
    path: filePath,
    type: fileType,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    bucket: bucketName,
  };
}

/**
 * Uploads multiple files in parallel
 */
export async function uploadFiles(
  files: File[], 
  options?: UploadOptions
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => 
    uploadFile(file, options).catch(error => {
      console.error(`Error uploading file ${file.name}:`, error);
      throw error;
    })
  );
  
  return Promise.all(uploadPromises);
}

/**
 * Deletes a file from storage
 */
export async function deleteFile(filePath: string, bucket: BucketName = 'CHAT'): Promise<void> {
  const supabase = createClientComponentClient();
  const bucketName = BUCKETS[bucket];
  
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);
    
  if (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Gets a public URL for a file
 */
export function getFileUrl(filePath: string, bucket: BucketName = 'CHAT'): string {
  const supabase = createClientComponentClient();
  const bucketName = BUCKETS[bucket];
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return publicUrl;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Gets the file type from a file name or path
 */
export function getFileType(filename: string): FileType {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'document';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return 'audio';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(extension)) return 'video';
  
  return 'other';
}

/**
 * Gets the appropriate icon for a file type
 */
export function getFileIcon(fileType: FileType): string {
  switch (fileType) {
    case 'image': return '🖼️';
    case 'document': return '📄';
    case 'audio': return '🎵';
    case 'video': return '🎬';
    default: return '📁';
  }
}

/**
 * Extracts file extension from a filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Checks if a file is an image
 */
export function isImageFile(file: File | string): boolean {
  if (typeof file === 'string') {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(getFileExtension(file));
  }
  return file.type.startsWith('image/');
}

/**
 * Previews a file (for images and videos)
 */
export function previewFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    if (isImageFile(file) || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    } else {
      reject(new Error('File type not supported for preview'));
    }
  });
}
