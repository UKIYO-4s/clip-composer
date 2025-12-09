import React from 'react';
import { useSelector } from 'react-redux';
import PreviewCanvas from './PreviewCanvas';
import { useAudioPreview } from '../../hooks/useAudioPreview';

/**
 * Preview - プレビューパネルコンポーネント
 * 16:9のアスペクト比を維持してプレビュー領域を表示
 */
function Preview() {
  const { currentFrame, fps } = useSelector((state) => state.timeline);

  // オーディオプレビュー再生
  useAudioPreview();

  // フレームをタイムコードに変換 (HH:MM:SS:FF)
  const frameToTimecode = (frame) => {
    const totalSeconds = Math.floor(frame / fps);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const frames = frame % fps;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-base p-4">
      <div className="relative w-full max-w-4xl">
        {/* 16:9 アスペクト比コンテナ */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <div className="absolute inset-0 bg-black rounded-lg overflow-hidden border border-line-subtle shadow-lg">
            {/* プレビューキャンバス */}
            <PreviewCanvas />

            {/* タイムコード表示（右下） */}
            <div className="absolute bottom-2 right-2 bg-surface-base/80 shadow-md shadow-[0_1px_2px_rgba(0,0,0,0.6)] px-2 py-1 rounded text-xs text-ink-primary font-mono">
              {frameToTimecode(currentFrame)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Preview;
