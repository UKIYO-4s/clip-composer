/**
 * useAudioPreview - オーディオプレビュー再生フック
 * BGM/SEクリップの再生を管理
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';

// オーディオ要素のキャッシュ
const audioCache = new Map();

/**
 * ファイルパスをfile://URLに変換
 */
const toFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('file://') || filePath.startsWith('http')) {
    return filePath;
  }
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `file://${normalizedPath}`;
};

/**
 * オーディオ要素を取得（キャッシュあり）
 */
const getAudioElement = (filePath) => {
  if (!filePath) return null;

  if (audioCache.has(filePath)) {
    return audioCache.get(filePath);
  }

  const audio = new Audio();
  audio.src = toFileUrl(filePath);
  audio.preload = 'auto';
  audioCache.set(filePath, audio);
  return audio;
};

/**
 * useAudioPreview フック
 */
export function useAudioPreview() {
  const { layers, layerOrder, currentFrame, fps, isPlaying } = useSelector(
    (state) => state.timeline
  );
  const activeAudiosRef = useRef(new Map());
  const lastFrameRef = useRef(-1);

  // 現在フレームでアクティブなオーディオクリップを取得
  const getActiveAudioClips = useCallback(() => {
    const audioClips = [];

    Object.values(layers).forEach((layer) => {
      layer.clips.forEach((clip) => {
        if (clip.type === 'bgm' || clip.type === 'se') {
          const clipEndFrame = clip.startFrame + clip.durationFrames;
          if (currentFrame >= clip.startFrame && currentFrame < clipEndFrame) {
            audioClips.push(clip);
          }
        }
      });
    });

    return audioClips;
  }, [layers, currentFrame]);

  // オーディオの再生状態を更新
  useEffect(() => {
    const activeClips = getActiveAudioClips();
    const activeClipIds = new Set(activeClips.map((c) => c.id));

    // 再生中でなくなったオーディオを停止
    activeAudiosRef.current.forEach((audio, clipId) => {
      if (!activeClipIds.has(clipId)) {
        audio.pause();
        activeAudiosRef.current.delete(clipId);
      }
    });

    if (!isPlaying) {
      // 再生停止時はすべてのオーディオを停止
      activeAudiosRef.current.forEach((audio) => {
        audio.pause();
      });
      activeAudiosRef.current.clear();
      return;
    }

    // アクティブなクリップを再生
    activeClips.forEach((clip) => {
      const audio = getAudioElement(clip.filePath);
      if (!audio) return;

      // ボリューム設定
      const volume = (clip.volume ?? 100) / 100;
      audio.volume = Math.max(0, Math.min(1, volume));

      // クリップ内の相対時間を計算
      const relativeFrame = currentFrame - clip.startFrame;
      const timeInSeconds = relativeFrame / fps;

      // シーク（大きく位置がずれている場合のみ）
      if (Math.abs(audio.currentTime - timeInSeconds) > 0.5) {
        audio.currentTime = timeInSeconds;
      }

      // 再生開始
      if (audio.paused) {
        audio.play().catch((e) => {
          // 自動再生ポリシーによるエラーは無視
          if (e.name !== 'NotAllowedError') {
            console.error('Audio play error:', e);
          }
        });
      }

      activeAudiosRef.current.set(clip.id, audio);
    });

    lastFrameRef.current = currentFrame;
  }, [isPlaying, currentFrame, fps, getActiveAudioClips]);

  // フレームジャンプ時の処理
  useEffect(() => {
    const frameDiff = Math.abs(currentFrame - lastFrameRef.current);

    // 大きくジャンプした場合はオーディオをリシーク
    if (frameDiff > fps) {
      activeAudiosRef.current.forEach((audio, clipId) => {
        const clip = getActiveAudioClips().find((c) => c.id === clipId);
        if (clip) {
          const relativeFrame = currentFrame - clip.startFrame;
          const timeInSeconds = relativeFrame / fps;
          audio.currentTime = timeInSeconds;
        }
      });
    }

    lastFrameRef.current = currentFrame;
  }, [currentFrame, fps, getActiveAudioClips]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      activeAudiosRef.current.forEach((audio) => {
        audio.pause();
      });
      activeAudiosRef.current.clear();
    };
  }, []);

  return {
    activeAudioCount: activeAudiosRef.current.size,
  };
}

export default useAudioPreview;
