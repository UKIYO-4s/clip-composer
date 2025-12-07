import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useDrag } from 'react-dnd';
import { selectClip, resizeClipStart, resizeClipEnd } from '../../store/timelineSlice';

// ドラッグ&ドロップ用アイテムタイプ
export const ItemTypes = {
  CLIP: 'clip',
};

/**
 * Clip - タイムライン上のクリップコンポーネント
 * クリップタイプごとに色分けして表示
 */
const Clip = ({ clip, layerId, pixelsPerFrame, isSelected = false }) => {
  const dispatch = useDispatch();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null); // 'start' or 'end'
  const resizeDataRef = useRef({});

  // useDrag フック
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CLIP,
    item: () => {
      // ドラッグ開始時にクリップを選択
      dispatch(selectClip(clip.id));
      return {
        id: clip.id,
        layerId,
        startFrame: clip.startFrame,
        durationFrames: clip.durationFrames,
        type: clip.type,
        name: clip.name,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isResizing, // リサイズ中はドラッグ無効
  }), [clip, layerId, isResizing]);

  // クリップの幅計算
  const width = clip.durationFrames * pixelsPerFrame;

  // クリップの位置計算
  const left = clip.startFrame * pixelsPerFrame;

  // クリップの長さ（秒数表示、fps=30固定）
  const durationSeconds = (clip.durationFrames / 30).toFixed(1);

  // クリップタイプごとの色分け
  const getClipColor = (type) => {
    const colorMap = {
      video: 'bg-clip-video',
      text: 'bg-clip-text',
      image: 'bg-clip-image',
      bgm: 'bg-clip-audio',
      se: 'bg-clip-se',
      adjustment: 'bg-clip-adjust',
    };
    return colorMap[type] || 'bg-surface-raised';
  };

  // クリップクリックで選択
  const handleClick = (e) => {
    e.stopPropagation();
    dispatch(selectClip(clip.id));
  };

  // リサイズハンドルのマウスダウン
  const handleResizeMouseDown = (e, type) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeType(type);

    resizeDataRef.current = {
      startX: e.clientX,
      originalStartFrame: clip.startFrame,
      originalDuration: clip.durationFrames,
    };

    // クリップを選択
    dispatch(selectClip(clip.id));
  };

  // リサイズ処理
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeDataRef.current.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);

      if (resizeType === 'start') {
        // 左端リサイズ（開始位置変更）
        const newStartFrame = Math.max(0, resizeDataRef.current.originalStartFrame + deltaFrames);
        dispatch(resizeClipStart({ layerId, clipId: clip.id, newStartFrame }));
      } else if (resizeType === 'end') {
        // 右端リサイズ（終了位置変更）
        const newDuration = Math.max(1, resizeDataRef.current.originalDuration + deltaFrames);
        dispatch(resizeClipEnd({ layerId, clipId: clip.id, newDurationFrames: newDuration }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeType(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeType, clip.id, layerId, pixelsPerFrame, dispatch]);

  return (
    <div
      ref={drag}
      className={`
        absolute top-1 bottom-1 rounded
        ${getClipColor(clip.type)}
        border border-line
        shadow-[0_1px_0_rgba(0,0,0,0.35)]
        hover:brightness-110
        cursor-grab active:cursor-grabbing
        flex items-center px-2
        ${isSelected ? 'ring-2 ring-accent-blue/80 shadow-glow-blue' : ''}
        ${isDragging ? 'opacity-50' : ''}
        overflow-hidden
        transition-all duration-100
        group
      `}
      style={{
        width: `${width}px`,
        left: `${left}px`,
        minWidth: '20px',
      }}
      onClick={handleClick}
      title={`${clip.name} (${durationSeconds}s)`}
    >
      {/* 左端リサイズハンドル */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-ink-primary/50 hover:bg-ink-primary/80 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => handleResizeMouseDown(e, 'start')}
        onClick={(e) => e.stopPropagation()}
      />

      {/* クリップテキスト - 選択状態でもテキスト色は変更しない */}
      <div className="flex flex-col justify-center min-w-0 w-full">
        {/* クリップ名（省略表示） */}
        <div className="text-[12px] font-semibold text-ink-primary truncate text-shadow-clip">
          {clip.name}
        </div>
        {/* 長さ（秒数表示） */}
        {width > 40 && (
          <div className="text-[12px] text-ink-primary opacity-80 text-shadow-clip">
            {durationSeconds}s
          </div>
        )}
      </div>

      {/* 右端リサイズハンドル */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 bg-ink-primary/50 hover:bg-ink-primary/80 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => handleResizeMouseDown(e, 'end')}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default Clip;
