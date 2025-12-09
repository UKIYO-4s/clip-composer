/**
 * useMediaCache - メディアファイルのキャッシュ管理フック
 * 画像とビデオをキャッシュし、プレビュー描画用に提供
 */

import { useRef, useCallback } from 'react';

// グローバルキャッシュ（コンポーネント間で共有）
const imageCache = new Map();
const videoCache = new Map();

// 最大キャッシュサイズ
const MAX_IMAGE_CACHE = 50;
const MAX_VIDEO_CACHE = 10;

/**
 * ファイルパスをfile://URLに変換
 */
const toFileUrl = (filePath) => {
  if (!filePath) return null;
  // 既にURLの場合はそのまま返す
  if (filePath.startsWith('file://') || filePath.startsWith('http')) {
    return filePath;
  }
  // Windowsパスを処理
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `file://${normalizedPath}`;
};

/**
 * 画像を読み込む（キャッシュあり）
 */
export const loadImage = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('No file path provided'));
      return;
    }

    // キャッシュチェック
    if (imageCache.has(filePath)) {
      resolve(imageCache.get(filePath));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // キャッシュサイズ制限
      if (imageCache.size >= MAX_IMAGE_CACHE) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }
      imageCache.set(filePath, img);
      resolve(img);
    };

    img.onerror = (e) => {
      console.error('Image load error:', filePath, e);
      reject(new Error(`Failed to load image: ${filePath}`));
    };

    img.src = toFileUrl(filePath);
  });
};

/**
 * ビデオ要素を取得（キャッシュあり）
 */
export const getVideoElement = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('No file path provided'));
      return;
    }

    // キャッシュチェック
    if (videoCache.has(filePath)) {
      resolve(videoCache.get(filePath));
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true; // プレビュー時はミュート
    video.preload = 'auto';

    video.onloadeddata = () => {
      // キャッシュサイズ制限
      if (videoCache.size >= MAX_VIDEO_CACHE) {
        const firstKey = videoCache.keys().next().value;
        const oldVideo = videoCache.get(firstKey);
        oldVideo.src = ''; // メモリ解放
        videoCache.delete(firstKey);
      }
      videoCache.set(filePath, video);
      resolve(video);
    };

    video.onerror = (e) => {
      console.error('Video load error:', filePath, e);
      reject(new Error(`Failed to load video: ${filePath}`));
    };

    video.src = toFileUrl(filePath);
    video.load();
  });
};

/**
 * ビデオの特定時間のフレームを取得
 */
export const seekVideoToTime = (video, timeInSeconds) => {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeInSeconds) < 0.01) {
      // 既に目的の時間にいる場合
      resolve(video);
      return;
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve(video);
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = timeInSeconds;
  });
};

/**
 * キャッシュをクリア
 */
export const clearMediaCache = () => {
  imageCache.clear();
  videoCache.forEach((video) => {
    video.src = '';
  });
  videoCache.clear();
};

/**
 * useMediaCache フック
 */
export function useMediaCache() {
  const loadingRef = useRef(new Set());

  const getImage = useCallback(async (filePath) => {
    if (loadingRef.current.has(filePath)) {
      // 読み込み中の場合はキャッシュから取得を試みる
      return imageCache.get(filePath) || null;
    }

    loadingRef.current.add(filePath);
    try {
      const img = await loadImage(filePath);
      return img;
    } catch (e) {
      console.error('getImage error:', e);
      return null;
    } finally {
      loadingRef.current.delete(filePath);
    }
  }, []);

  const getVideo = useCallback(async (filePath) => {
    if (loadingRef.current.has(filePath)) {
      return videoCache.get(filePath) || null;
    }

    loadingRef.current.add(filePath);
    try {
      const video = await getVideoElement(filePath);
      return video;
    } catch (e) {
      console.error('getVideo error:', e);
      return null;
    } finally {
      loadingRef.current.delete(filePath);
    }
  }, []);

  const seekVideo = useCallback(async (filePath, timeInSeconds) => {
    const video = videoCache.get(filePath);
    if (!video) return null;

    try {
      await seekVideoToTime(video, timeInSeconds);
      return video;
    } catch (e) {
      console.error('seekVideo error:', e);
      return null;
    }
  }, []);

  return {
    getImage,
    getVideo,
    seekVideo,
    clearCache: clearMediaCache,
  };
}

export default useMediaCache;
