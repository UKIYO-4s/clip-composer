import React, { useRef, useCallback, memo, useEffect } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { useDrop } from 'react-dnd';
import Clip, { ItemTypes } from './Clip';
import { moveClip, moveClipToLayer, duplicateClipToPosition, moveClipsWithDelta, duplicateClipsWithDelta, saveToHistory, selectSelectedClipIds } from '../../store/timelineSlice';

/**
 * Layer - タイムライン上のレイヤーコンポーネント
 * クリップのドロップターゲットとして機能
 * React.memoでメモ化して不要な再レンダーを防止
 */
const Layer = memo(function Layer({ layerId, layer, pixelsPerFrame, snapBoundaries, snapThresholdFrames, onSnapGuideShow, onSnapGuideHide }) {
  const dispatch = useDispatch();
  const selectedClipIds = useSelector(selectSelectedClipIds, shallowEqual);
  const layerRef = useRef(null);
  const hoverRafRef = useRef(null); // rAFスロットリング用

  // rAFのクリーンアップ
  useEffect(() => {
    return () => {
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current);
      }
    };
  }, []);

  const isVideoLayer = layer.type === 'video';

  // 二分探索で最も近い境界を見つける（O(log n)）
  const findNearestBoundaries = useCallback((boundaries, target) => {
    if (!boundaries || boundaries.length === 0) return [];

    let left = 0;
    let right = boundaries.length - 1;

    // 二分探索でtargetに最も近い位置を見つける
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (boundaries[mid].frame < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // 周辺の境界を返す（left-1, left, left+1）
    const candidates = [];
    if (left > 0) candidates.push(boundaries[left - 1]);
    if (left < boundaries.length) candidates.push(boundaries[left]);
    if (left + 1 < boundaries.length) candidates.push(boundaries[left + 1]);

    return candidates;
  }, []);

  // スナップ計算関数（二分探索最適化版）
  const calculateSnappedFrame = useCallback((candidateFrame, clipDuration = 0, isAltPressed = false) => {
    // Altキーが押されている場合はスナップを無効化
    if (isAltPressed || !snapBoundaries || snapBoundaries.length === 0) {
      return {
        snappedFrame: candidateFrame,
        didSnap: false,
        snapPosition: null,
        snapSources: [],
      };
    }

    const candidateEndFrame = candidateFrame + clipDuration;
    let bestSnapResult = null;
    let minDistance = Infinity;

    // 開始フレーム周辺の境界を取得（二分探索）
    const startCandidates = findNearestBoundaries(snapBoundaries, candidateFrame);
    for (const boundary of startCandidates) {
      const startDistance = Math.abs(candidateFrame - boundary.frame);
      if (startDistance < minDistance && startDistance <= snapThresholdFrames) {
        minDistance = startDistance;
        bestSnapResult = {
          snappedFrame: boundary.frame,
          didSnap: true,
          snapPosition: boundary.frame,
          snapSources: boundary.sources,
        };
      }
    }

    // 終了フレーム周辺の境界を取得（クリップの長さがある場合）
    if (clipDuration > 0) {
      const endCandidates = findNearestBoundaries(snapBoundaries, candidateEndFrame);
      for (const boundary of endCandidates) {
        const endDistance = Math.abs(candidateEndFrame - boundary.frame);
        if (endDistance < minDistance && endDistance <= snapThresholdFrames) {
          minDistance = endDistance;
          bestSnapResult = {
            snappedFrame: boundary.frame - clipDuration,
            didSnap: true,
            snapPosition: boundary.frame,
            snapSources: boundary.sources,
          };
        }
      }
    }

    if (bestSnapResult) {
      return bestSnapResult;
    }

    return {
      snappedFrame: candidateFrame,
      didSnap: false,
      snapPosition: null,
      snapSources: [],
    };
  }, [snapBoundaries, snapThresholdFrames, findNearestBoundaries]);

  // useDrop フック（hover時はrAFでスロットリング）
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CLIP,
    hover: (item, monitor) => {
      if (!layerRef.current || !onSnapGuideShow || !onSnapGuideHide) return;

      // 既にrAFがスケジュールされていたらスキップ（スロットリング）
      if (hoverRafRef.current) return;

      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;

        // ドラッグ中のスナップガイド表示
        const offset = monitor.getClientOffset();
        if (!offset) return;

        const layerRect = layerRef.current.getBoundingClientRect();
        const dropX = offset.x - layerRect.left;
        // grabOffsetPx を引くことで、クリップ左端がドロップ位置に来るように補正
        const grabOffsetPx = item.grabOffsetPx || 0;
        const candidateFrame = Math.max(0, Math.round((dropX - grabOffsetPx) / pixelsPerFrame));

        // Altキー状態を確認（Altでスナップ無効化）
        const isAltPressed = window.__isAltPressed || false;

        // クリップの長さを取得
        const clipDuration = item.durationFrames || 0;

        const snapResult = calculateSnappedFrame(candidateFrame, clipDuration, isAltPressed);

        if (snapResult.didSnap) {
          onSnapGuideShow({
            position: snapResult.snapPosition,
            sources: snapResult.snapSources,
          });
        } else {
          onSnapGuideHide();
        }
      });
    },
    drop: (item, monitor) => {
      if (!layerRef.current) return;

      // スナップガイドを非表示
      if (onSnapGuideHide) {
        onSnapGuideHide();
      }

      // ドロップ位置を計算（grabOffsetPx を使用してクリップ左端基準に補正）
      const offset = monitor.getClientOffset();
      const layerRect = layerRef.current.getBoundingClientRect();
      const dropX = offset.x - layerRect.left;
      // grabOffsetPx を引くことで、クリップ左端がドロップ位置に来るように補正
      const grabOffsetPx = item.grabOffsetPx || 0;
      const candidateFrame = Math.max(0, Math.round((dropX - grabOffsetPx) / pixelsPerFrame));

      // Altキー状態を確認（グローバル変数から取得）
      const isAltPressed = window.__isAltPressed || false;

      // クリップの長さを取得
      const clipDuration = item.durationFrames || 0;

      // スナップ計算（Altでスナップ無効化）
      const snapResult = calculateSnappedFrame(candidateFrame, clipDuration, isAltPressed);
      const newStartFrame = Math.max(0, snapResult.snappedFrame);

      // 複数選択されている場合
      const clipIds = item.clipIds || [item.id];

      if (clipIds.length > 1 && item.selectedClipsInfo) {
        // フレーム差分を計算（ドラッグ元の基準クリップからの差分）
        const deltaFrame = newStartFrame - item.originalStartFrame;

        // clipMoves 配列を構築（各クリップの元の位置情報を使用）
        const clipMoves = item.selectedClipsInfo.map(info => ({
          fromLayerId: info.layerId,
          clipId: info.clipId,
          originalStartFrame: info.startFrame,
        }));

        dispatch(saveToHistory());
        if (isAltPressed) {
          dispatch(duplicateClipsWithDelta({
            clipMoves,
            deltaFrame,
            targetLayerId: null, // 各クリップを元のレイヤーに複製
          }));
        } else {
          dispatch(moveClipsWithDelta({
            clipMoves,
            deltaFrame,
            targetLayerId: null, // 各クリップを元のレイヤー内で移動
          }));
        }
      } else {
        // 単一クリップの処理（既存ロジック）
        dispatch(saveToHistory());
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
  }), [layerId, pixelsPerFrame, dispatch, calculateSnappedFrame, onSnapGuideShow, onSnapGuideHide]);

  // ref を結合
  const setRefs = (el) => {
    layerRef.current = el;
    drop(el);
  };

  // グリッド間隔（30フレームごと）をピクセルで計算
  const gridSpacingPx = 30 * pixelsPerFrame;

  return (
    <div
      ref={setRefs}
      className={`h-12 relative border-b border-line ${
        isVideoLayer ? 'bg-surface-raised/50' : 'bg-surface-raised/30'
      } ${isOver && canDrop ? 'bg-accent-blue/50' : ''}`}
      style={{
        // CSSグリッドパターン（DOM要素を減らして高速化）
        backgroundImage: `repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.08) 0px,
          rgba(255, 255, 255, 0.08) 1px,
          transparent 1px,
          transparent ${gridSpacingPx}px
        )`,
        backgroundSize: `${gridSpacingPx}px 100%`,
      }}
    >
      {/* クリップ */}
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
});

export default Layer;
