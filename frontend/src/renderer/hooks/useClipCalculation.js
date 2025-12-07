import { useMemo } from 'react';

/**
 * クリップ配置の計算ロジック
 * UIから分離された純粋な計算フック
 */
export const useClipCalculation = ({
  inputMode,
  clipCount,
  clipDuration, // フレーム
  totalDuration, // 秒
  fps = 30,
}) => {
  return useMemo(() => {
    switch (inputMode) {
      case 'clipDuration': {
        // クリップ長指定モード
        const totalFrames = clipCount * clipDuration;
        const totalSeconds = totalFrames / fps;
        return {
          clipCount,
          clipDurationFrames: clipDuration,
          clipDurationSeconds: clipDuration / fps,
          totalFrames,
          totalSeconds,
          summary: `合計: ${totalSeconds.toFixed(2)}秒 (${totalFrames}フレーム)`,
        };
      }

      case 'divideDuration': {
        // 合計時間分割モード
        const totalFrames = Math.round(totalDuration * fps);
        const framesPerClip = Math.max(1, Math.round(totalFrames / clipCount));
        const actualTotal = framesPerClip * clipCount;
        return {
          clipCount,
          clipDurationFrames: framesPerClip,
          clipDurationSeconds: framesPerClip / fps,
          totalFrames: actualTotal,
          totalSeconds: actualTotal / fps,
          summary: `各クリップ: ${framesPerClip}フレーム (${(framesPerClip / fps).toFixed(3)}秒)`,
        };
      }

      case 'fillDuration': {
        // 時間埋めモード
        const totalFrames = Math.round(totalDuration * fps);
        const calculatedCount = Math.max(1, Math.floor(totalFrames / clipDuration));
        const actualTotal = calculatedCount * clipDuration;
        return {
          clipCount: calculatedCount,
          clipDurationFrames: clipDuration,
          clipDurationSeconds: clipDuration / fps,
          totalFrames: actualTotal,
          totalSeconds: actualTotal / fps,
          summary: `クリップ数: ${calculatedCount}個`,
        };
      }

      default:
        return {
          clipCount: 0,
          clipDurationFrames: 0,
          clipDurationSeconds: 0,
          totalFrames: 0,
          totalSeconds: 0,
          summary: '',
        };
    }
  }, [inputMode, clipCount, clipDuration, totalDuration, fps]);
};

export default useClipCalculation;
