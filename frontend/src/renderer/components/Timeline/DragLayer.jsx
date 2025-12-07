import React from 'react';
import { useDragLayer } from 'react-dnd';
import { ItemTypes } from './Clip';

/**
 * カスタムドラッグレイヤー
 * ドラッグ中のクリップのプレビューを表示
 */
const DragLayer = ({ pixelsPerFrame }) => {
  const { isDragging, item, currentOffset, initialOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
    initialOffset: monitor.getInitialClientOffset(),
  }));

  if (!isDragging || !item || !currentOffset) {
    return null;
  }

  // クリップの幅を計算
  const width = item.durationFrames * pixelsPerFrame;

  // クリップタイプごとの色
  const getClipColor = (type) => {
    const colorMap = {
      video: 'bg-track-video',
      text: 'bg-track-text',
      image: 'bg-track-image',
      bgm: 'bg-track-audio',
      audio: 'bg-track-audio',
      se: 'bg-track-se',
      adjustment: 'bg-track-adjust',
      random_layer: 'bg-track-random',
      variable_text: 'bg-track-vartext',
    };
    return colorMap[type] || 'bg-surface-raised';
  };

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: currentOffset.x - 10,
        top: currentOffset.y - 20,
      }}
    >
      <div
        className={`
          ${getClipColor(item.type)}
          rounded border border-accent-blue
          shadow-lg shadow-accent-blue/30
          px-2 py-1
          opacity-80
        `}
        style={{
          width: `${Math.min(width, 200)}px`,
          height: '40px',
        }}
      >
        <div className="text-xs font-semibold text-ink-primary truncate">
          {item.name}
        </div>
        <div className="text-xs text-ink-muted">
          {(item.durationFrames / 30).toFixed(1)}s
        </div>
      </div>
    </div>
  );
};

export default DragLayer;
