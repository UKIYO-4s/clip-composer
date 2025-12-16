import React from 'react';

/**
 * スナップガイドライン表示コンポーネント
 * ドラッグ中にスナップ位置を視覚的に表示
 */
const SnapGuide = ({ snapPosition, pixelsPerFrame, visible }) => {
  if (!visible || snapPosition === null) {
    return null;
  }

  const left = snapPosition * pixelsPerFrame;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-accent-cyan z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      {/* 上部のインジケーター */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_rgba(60,207,218,0.7)]" />
      {/* 下部のインジケーター */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_rgba(60,207,218,0.7)]" />
    </div>
  );
};

export default SnapGuide;
