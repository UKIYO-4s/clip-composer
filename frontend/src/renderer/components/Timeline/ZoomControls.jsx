import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setZoom,
  zoomIn,
  zoomOut,
  selectPixelsPerFrame,
  selectMinPixelsPerFrame,
  selectMaxPixelsPerFrame,
  selectLayers,
  selectLayerOrder,
} from '../../store/timelineSlice';
import { Plus, Minus, Maximize } from '../Icons';

const ZoomControls = ({ timelineRef }) => {
  const dispatch = useDispatch();
  const pixelsPerFrame = useSelector(selectPixelsPerFrame);
  const minPixelsPerFrame = useSelector(selectMinPixelsPerFrame);
  const maxPixelsPerFrame = useSelector(selectMaxPixelsPerFrame);
  const layers = useSelector(selectLayers);
  const layerOrder = useSelector(selectLayerOrder);

  // ズーム率を計算（デフォルト2pxを100%とする）
  const zoomPercent = Math.round((pixelsPerFrame / 2) * 100);

  // ズームイン
  const handleZoomIn = useCallback(() => {
    dispatch(zoomIn());
  }, [dispatch]);

  // ズームアウト
  const handleZoomOut = useCallback(() => {
    dispatch(zoomOut());
  }, [dispatch]);

  // スライダー変更
  const handleSliderChange = useCallback((e) => {
    dispatch(setZoom(Number(e.target.value)));
  }, [dispatch]);

  // 全体表示（全クリップが収まるようにズーム）
  const handleFitToView = useCallback(() => {
    if (!timelineRef?.current) return;

    // 全クリップの最大終了フレームを取得
    let maxEndFrame = 0;
    layerOrder.forEach((layerId) => {
      const layer = layers[layerId];
      layer.clips.forEach((clip) => {
        const endFrame = clip.startFrame + clip.durationFrames;
        if (endFrame > maxEndFrame) {
          maxEndFrame = endFrame;
        }
      });
    });

    if (maxEndFrame === 0) {
      maxEndFrame = 300; // デフォルト10秒
    }

    // タイムライン幅に収まるズームレベルを計算（マージン込み）
    const timelineWidth = timelineRef.current.clientWidth - 120; // レイヤーヘッダー分を引く
    const newZoom = Math.max(minPixelsPerFrame, timelineWidth / maxEndFrame);

    dispatch(setZoom(newZoom));
    timelineRef.current.scrollLeft = 0;
  }, [dispatch, timelineRef, layers, layerOrder, minPixelsPerFrame]);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-surface-raised border-t border-line">
      {/* ズームアウト */}
      <button
        onClick={handleZoomOut}
        className="p-1 hover:bg-state-hover rounded text-ink-secondary hover:text-ink-primary transition-colors"
        title="ズームアウト (Option + ホイール下)"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* スライダー */}
      <input
        type="range"
        min={minPixelsPerFrame}
        max={maxPixelsPerFrame}
        step={0.1}
        value={pixelsPerFrame}
        onChange={handleSliderChange}
        className="w-24 h-1 bg-surface-sunken rounded appearance-none cursor-pointer accent-accent-blue"
        title={`ズームレベル: ${zoomPercent}% (ドラッグで調整、または Option + ホイールでズーム)`}
      />

      {/* ズームイン */}
      <button
        onClick={handleZoomIn}
        className="p-1 hover:bg-state-hover rounded text-ink-secondary hover:text-ink-primary transition-colors"
        title="ズームイン (Option + ホイール上)"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* 区切り */}
      <div className="w-px h-4 bg-line mx-1" />

      {/* 全体表示 */}
      <button
        onClick={handleFitToView}
        className="flex items-center gap-1 px-2 py-1 text-xs text-ink-secondary hover:bg-state-hover rounded transition-colors"
        title="全体表示: 全てのクリップが画面内に収まるようにズームを調整します"
      >
        <Maximize className="w-3 h-3" />
        全体表示
      </button>

      {/* ズーム率 */}
      <span className="text-xs text-ink-muted w-12 text-right">
        {zoomPercent}%
      </span>
    </div>
  );
};

export default ZoomControls;
