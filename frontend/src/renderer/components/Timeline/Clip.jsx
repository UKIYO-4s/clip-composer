import React from 'react';
import { useDispatch } from 'react-redux';
import { selectClip } from '../../store/timelineSlice';

/**
 * Clip - タイムライン上のクリップコンポーネント
 * クリップタイプごとに色分けして表示
 */
const Clip = ({ clip, layerId, pixelsPerFrame, isSelected = false }) => {
  const dispatch = useDispatch();

  // クリップの幅計算
  const width = clip.durationFrames * pixelsPerFrame;

  // クリップの位置計算
  const left = clip.startFrame * pixelsPerFrame;

  // クリップの長さ（秒数表示、fps=30固定）
  const durationSeconds = (clip.durationFrames / 30).toFixed(1);

  // クリップタイプごとの色分け
  const getClipColor = (type) => {
    const colorMap = {
      video: 'bg-blue-600',
      text: 'bg-yellow-500',
      image: 'bg-green-500',
      bgm: 'bg-purple-600',
      se: 'bg-cyan-500',
      adjustment: 'bg-pink-500',
    };
    return colorMap[type] || 'bg-gray-500';
  };

  // クリップクリックで選択
  const handleClick = (e) => {
    e.stopPropagation();
    dispatch(selectClip(clip.id));
  };

  return (
    <div
      className={`
        absolute top-1 bottom-1 rounded
        ${getClipColor(clip.type)}
        hover:brightness-110
        cursor-pointer
        flex items-center px-2
        ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}
        overflow-hidden
        transition-all duration-100
      `}
      style={{
        width: `${width}px`,
        left: `${left}px`,
        minWidth: '20px',
      }}
      onClick={handleClick}
      title={`${clip.name} (${durationSeconds}s)`}
    >
      <div className="flex flex-col justify-center min-w-0 w-full">
        {/* クリップ名（省略表示） */}
        <div className="text-white text-xs font-semibold truncate">
          {clip.name}
        </div>
        {/* 長さ（秒数表示） */}
        {width > 40 && (
          <div className="text-white text-xs opacity-80">
            {durationSeconds}s
          </div>
        )}
      </div>
    </div>
  );
};

export default Clip;
