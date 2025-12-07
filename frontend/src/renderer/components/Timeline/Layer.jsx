import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDrop } from 'react-dnd';
import Clip, { ItemTypes } from './Clip';
import { moveClip, moveClipToLayer, duplicateClipToPosition, moveClipsWithDelta, duplicateClipsWithDelta } from '../../store/timelineSlice';

function Layer({ layerId, layer, pixelsPerFrame }) {
  const dispatch = useDispatch();
  const selectedClipIds = useSelector((state) => state.timeline.selectedClipIds);
  const layerRef = useRef(null);

  const isVideoLayer = layer.type === 'video';

  // useDrop フック
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CLIP,
    drop: (item, monitor) => {
      if (!layerRef.current) return;

      // ドロップ位置を計算
      const offset = monitor.getClientOffset();
      const layerRect = layerRef.current.getBoundingClientRect();
      const dropX = offset.x - layerRect.left;
      const newStartFrame = Math.max(0, Math.round(dropX / pixelsPerFrame));

      // Altキー状態を確認（グローバル変数から取得）
      const isAltPressed = window.__isAltPressed || false;

      // 複数選択されている場合
      const clipIds = item.clipIds || [item.id];

      if (clipIds.length > 1) {
        // フレーム差分を計算（ドラッグ元の基準クリップからの差分）
        const deltaFrame = newStartFrame - item.originalStartFrame;

        // clipMoves 配列を構築（各クリップの情報）
        // 注: 複数選択の場合、各クリップの元レイヤー情報が必要
        // ここでは簡略化のため、全てドラッグ元と同じレイヤーにあると仮定
        const clipMoves = clipIds.map(id => ({
          fromLayerId: item.layerId,
          clipId: id,
          originalStartFrame: item.originalStartFrame,
        }));

        if (isAltPressed) {
          dispatch(duplicateClipsWithDelta({
            clipMoves,
            deltaFrame,
            targetLayerId: layerId,
          }));
        } else {
          dispatch(moveClipsWithDelta({
            clipMoves,
            deltaFrame,
            targetLayerId: layerId,
          }));
        }
      } else {
        // 単一クリップの処理（既存ロジック）
        if (isAltPressed) {
          dispatch(duplicateClipToPosition({
            fromLayerId: item.layerId,
            toLayerId: layerId,
            clipId: item.id,
            newStartFrame,
          }));
        } else {
          if (item.layerId === layerId) {
            dispatch(moveClip({
              layerId,
              clipId: item.id,
              newStartFrame,
            }));
          } else {
            dispatch(moveClipToLayer({
              fromLayerId: item.layerId,
              toLayerId: layerId,
              clipId: item.id,
              newStartFrame,
            }));
          }
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [layerId, pixelsPerFrame, dispatch]);

  // ref を結合
  const setRefs = (el) => {
    layerRef.current = el;
    drop(el);
  };

  return (
    <div
      ref={setRefs}
      className={`h-12 relative border-b border-line ${
        isVideoLayer ? 'bg-surface-raised/50' : 'bg-surface-raised/30'
      } ${isOver && canDrop ? 'bg-accent-blue/50' : ''}`}
    >
      {/* ������1�Th	 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-line/50"
            style={{ left: `${i * 30 * pixelsPerFrame}px` }}
          />
        ))}
      </div>

      {/* ���� */}
      {layer.clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          layerId={layerId}
          pixelsPerFrame={pixelsPerFrame}
          isSelected={selectedClipIds.includes(clip.id)}
        />
      ))}
    </div>
  );
}

export default Layer;
