import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { selectClips, addToSelection, clearSelection } from '../../store/timelineSlice';

/**
 * MarqueeSelection - マウスドラッグによる範囲選択（マーキー選択）
 *
 * 空白エリアからドラッグすると、選択範囲が矩形で表示され、
 * 範囲内のクリップが自動的に選択される。
 *
 * 重要：console.logを使わない、mousemoveはthrottle必須
 */
const MarqueeSelection = ({ timelineRef, layers, layerOrder, pixelsPerFrame }) => {
  const dispatch = useDispatch();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // throttle用のタイムスタンプ
  const lastUpdateRef = useRef(0);
  const THROTTLE_MS = 50;

  // コールバックをrefで保持（依存関係の問題を回避）
  const handleMouseDownRef = useRef(null);

  // マウスダウン: 選択開始
  handleMouseDownRef.current = (e) => {
    // クリップ上やルーラー上のクリックは無視
    if (e.target.closest('[data-clip]') || e.target.closest('[data-ruler]')) return;

    // 左クリックのみ
    if (e.button !== 0) return;

    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft || 0;
    const scrollTop = timelineRef.current.scrollTop || 0;

    // タイムラインルーラーの高さ（24px）を考慮
    const RULER_HEIGHT = 24;

    // ルーラーエリアでのクリックは無視
    if (e.clientY - rect.top < RULER_HEIGHT) return;

    // タイムラインエリア内でのマウス位置
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop - RULER_HEIGHT;

    setIsSelecting(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setIsShiftPressed(e.shiftKey);

    // Shiftキーが押されていない場合は既存の選択をクリア
    if (!e.shiftKey) {
      dispatch(clearSelection());
    }
  };

  // マウスムーブ: 選択範囲更新（throttle適用）
  const handleMouseMove = useCallback((e) => {
    if (!isSelecting || !timelineRef.current) return;

    // throttle: 50ms間隔に制限
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;
    lastUpdateRef.current = now;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft || 0;
    const scrollTop = timelineRef.current.scrollTop || 0;

    const RULER_HEIGHT = 24;
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop - RULER_HEIGHT;

    setCurrentPoint({ x, y });
  }, [isSelecting, timelineRef]);

  // マウスアップ: 選択完了（dispatchはここでのみ行う）
  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    // 選択範囲内のクリップを検出
    const selectedIds = [];
    const LAYER_HEIGHT = 48; // レイヤーの高さ（h-12 = 48px）

    const minX = Math.min(startPoint.x, currentPoint.x);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    // フレーム範囲に変換
    const minFrame = minX / pixelsPerFrame;
    const maxFrame = maxX / pixelsPerFrame;

    // 各レイヤーをチェック
    layerOrder.forEach((layerId, layerIndex) => {
      const layer = layers[layerId];
      if (!layer) return;

      const layerTopY = layerIndex * LAYER_HEIGHT;
      const layerBottomY = (layerIndex + 1) * LAYER_HEIGHT;

      // 選択範囲とレイヤーが重なっているかチェック
      if (minY < layerBottomY && maxY > layerTopY) {
        // このレイヤー内のクリップをチェック
        layer.clips.forEach((clip) => {
          const clipStartFrame = clip.startFrame;
          const clipEndFrame = clip.startFrame + clip.durationFrames;

          // 選択範囲とクリップが重なっているかチェック
          if (clipStartFrame < maxFrame && clipEndFrame > minFrame) {
            selectedIds.push(clip.id);
          }
        });
      }
    });

    // 選択を適用（mouseup時のみdispatch）
    if (selectedIds.length > 0) {
      if (isShiftPressed) {
        // Shiftキーが押されている場合は既存の選択に追加
        dispatch(addToSelection({ clipIds: selectedIds }));
      } else {
        // 通常は新規選択
        dispatch(selectClips({ clipIds: selectedIds }));
      }
    }

    setIsSelecting(false);
  }, [isSelecting, startPoint, currentPoint, layers, layerOrder, pixelsPerFrame, isShiftPressed, dispatch]);

  // イベントリスナーの登録（安定したラッパー関数を使用）
  useEffect(() => {
    if (!timelineRef.current) return;

    const timeline = timelineRef.current;

    // 安定したラッパー関数（refを通じて最新のハンドラを呼び出す）
    const stableHandler = (e) => {
      if (handleMouseDownRef.current) {
        handleMouseDownRef.current(e);
      }
    };

    timeline.addEventListener('mousedown', stableHandler);

    return () => {
      timeline.removeEventListener('mousedown', stableHandler);
    };
  }, [timelineRef]);

  useEffect(() => {
    if (!isSelecting) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // マーキー選択の矩形を表示
  if (!isSelecting) return null;

  const RULER_HEIGHT = 24;
  const left = Math.min(startPoint.x, currentPoint.x);
  const top = Math.min(startPoint.y, currentPoint.y) + RULER_HEIGHT;
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);

  return (
    <div
      className="absolute border-2 border-accent-blue bg-accent-blue/10 pointer-events-none z-50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};

export default MarqueeSelection;
