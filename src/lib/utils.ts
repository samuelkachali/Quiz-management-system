import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | number) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date | string | number) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || ''}${path}`;
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function isArrayOfFile(files: unknown): files is File[] {
  const isArray = Array.isArray(files);
  if (!isArray) return false;
  return files.every((file) => file instanceof File);
}

export function formatBytes(
  bytes: number,
  decimals = 0,
  sizeType: 'accurate' | 'normal' = 'normal'
) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate' ? accurateSizes[i] ?? 'Bytest' : sizes[i] ?? 'Bytes'
  }`;
}

export function isMacOs() {
  if (typeof window === 'undefined') return false;
  return window.navigator.userAgent.includes('Mac');
}

export function formatFileSize(bytes?: number) {
  if (!bytes) {
    return '0 Bytes';
  }
  bytes = Number(bytes);
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }
  
  return parts.join(' ');
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(fileName: string) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const ext = getFileExtension(fileName);
  return imageExtensions.includes(ext);
}

export function isVideoFile(fileName: string) {
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const ext = getFileExtension(fileName);
  return videoExtensions.includes(ext);
}

export function isAudioFile(fileName: string) {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
  const ext = getFileExtension(fileName);
  return audioExtensions.includes(ext);
}

export function isDocumentFile(fileName: string) {
  const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  const ext = getFileExtension(fileName);
  return docExtensions.includes(ext);
}

export function getFileType(fileName: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (isImageFile(fileName)) return 'image';
  if (isVideoFile(fileName)) return 'video';
  if (isAudioFile(fileName)) return 'audio';
  if (isDocumentFile(fileName)) return 'document';
  return 'other';
}

export function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🔊';
    case 'document':
      return '📄';
    default:
      return '📁';
  }
}

export function generateRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isSafari() {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function isChrome() {
  if (typeof window === 'undefined') return false;
  return /Chrome/.test(navigator.userAgent) && !/Edg|OPR|OPX|SamsungBrowser/.test(navigator.userAgent);
}

export function isFirefox() {
  if (typeof window === 'undefined') return false;
  return /Firefox/.test(navigator.userAgent);
}

export function isEdge() {
  if (typeof window === 'undefined') return false;
  return /Edg/.test(navigator.userAgent);
}

export function isOpera() {
  if (typeof window === 'undefined') return false;
  return /OPR|Opera/.test(navigator.userAgent);
}

export function isIE() {
  if (typeof window === 'undefined') return false;
  return /Trident/.test(navigator.userAgent);
}

export function getBrowserName() {
  if (isChrome()) return 'Chrome';
  if (isFirefox()) return 'Firefox';
  if (isSafari()) return 'Safari';
  if (isEdge()) return 'Edge';
  if (isOpera()) return 'Opera';
  if (isIE()) return 'Internet Explorer';
  return 'Unknown';
}

export function getOSName() {
  if (typeof window === 'undefined') return 'Unknown';
  
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  
  if (iosPlatforms.indexOf(platform) !== -1) return 'iOS';
  if (macosPlatforms.indexOf(platform) !== -1) return 'macOS';
  if (windowsPlatforms.indexOf(platform) !== -1) return 'Windows';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Linux/.test(platform)) return 'Linux';
  
  return 'Unknown';
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function isOnline() {
  if (typeof window === 'undefined') return true; // Assume online for SSR
  return navigator.onLine;
}

export function isOffline() {
  return !isOnline();
}

export function addOnlineListener(callback: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function copyToClipboard(text: string) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    const successful = document.execCommand('copy');
    return Promise.resolve(successful);
  } catch (err) {
    return Promise.resolve(false);
  } finally {
    document.body.removeChild(textarea);
  }
}

export function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

export function setQueryParam(name: string, value: string) {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url.toString());
}

export function removeQueryParam(name: string) {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.pushState({}, '', url.toString());
}

export function getHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash.substring(1);
}

export function setHash(hash: string) {
  if (typeof window === 'undefined') return;
  window.location.hash = hash;
}

export function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  if (typeof window === 'undefined') return;
  window.scrollTo({
    top: 0,
    behavior,
  });
}

export function scrollToElement(
  elementId: string,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' }
) {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView(options);
  }
}

export function isElementInViewport(element: HTMLElement) {
  if (typeof window === 'undefined') return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function isElementPartiallyInViewport(element: HTMLElement) {
  if (typeof window === 'undefined') return false;
  
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  
  const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
  const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);
  
  return (vertInView && horInView);
}

export function getScrollPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  
  return {
    x: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
    y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop,
  };
}

export function getViewportSize() {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

export function getDocumentSize() {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  return {
    width: Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    ),
    height: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    ),
  };
}
