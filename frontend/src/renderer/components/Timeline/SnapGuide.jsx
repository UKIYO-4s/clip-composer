import React, { useEffect } from 'react';

/**
 * スナップガイドライン表示コンポーネント
 * ドラッグ中にスナップ位置を視覚的に表示
 */
const SnapGuide = ({ snapPosition, snapSources = [], pixelsPerFrame, visible }) => {
  if (!visible || snapPosition === null) {
    return null;
  }

  const left = snapPosition * pixelsPerFrame;
  const clipSources = snapSources.filter((source) => source.kind === 'clip');
  const fallbackSources = snapSources.filter((source) => source.kind !== 'clip');
  const displaySources = clipSources.length > 0 ? clipSources : fallbackSources;

  // スナップ対象のクリップを視覚的にハイライト
  useEffect(() => {
    const clipIds = displaySources
      .filter((source) => source.kind === 'clip' && source.clipId)
      .map((source) => source.clipId);

    if (clipIds.length === 0) return undefined;

    const elements = clipIds
      .map((id) => document.querySelector(`[data-clip="${id}"]`))
      .filter(Boolean);

    elements.forEach((el) => el.classList.add('snap-target-highlight'));

    return () => {
      elements.forEach((el) => el.classList.remove('snap-target-highlight'));
    };
  }, [displaySources]);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-accent-cyan z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      {/* 上部のインジケーター */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_rgba(60,207,218,0.7)]" />
      {/* 下部のインジケーター */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_rgba(60,207,218,0.7)]" />
      {displaySources.length > 0 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex max-w-[260px] flex-wrap justify-center gap-1 rounded-md border border-accent-cyan/50 bg-surface-raised/90 px-2 py-1 text-[11px] text-ink-primary shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          {displaySources.map((source) => {
            const key = `${source.kind}-${source.clipId || source.label || source.layerId}-${source.edge || 'any'}`;
            const edgeLabel = source.edge === 'start' ? '開始' : source.edge === 'end' ? '終了' : null;
            const badgeTint = source.kind === 'clip' ? 'bg-accent-blue/10 text-ink-primary' : 'bg-ink-muted/10 text-ink-secondary';
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-[2px] leading-none ${badgeTint}`}
              >
                {source.clipName || source.label || '境界'}
                {source.layerName && <span className="text-[10px] text-ink-secondary">・{source.layerName}</span>}
                {edgeLabel && <span className="text-[10px] text-accent-cyan/90">{edgeLabel}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SnapGuide;
