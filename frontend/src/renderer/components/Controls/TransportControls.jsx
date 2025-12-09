import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentFrame,
  setIsPlaying,
  setLoopEnabled,
  selectLayers,
  undo,
  redo,
  selectCanUndo,
  selectCanRedo,
} from '../../store/timelineSlice';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat,
  Undo,
  Redo,
} from '../Icons';

function TransportControls() {
  const dispatch = useDispatch();
  const {
    currentFrame,
    totalFrames,
    fps,
    isPlaying,
    loopEnabled,
  } = useSelector((state) => state.timeline);
  const layers = useSelector(selectLayers);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);

  const animationFrameId = useRef(null);
  const lastFrameTime = useRef(null);

  // 全クリップの境界点（開始位置・終了位置）を収集
  const clipBoundaries = useMemo(() => {
    const boundaries = new Set([0]); // 0フレームは常に含める

    Object.values(layers).forEach((layer) => {
      layer.clips.forEach((clip) => {
        boundaries.add(clip.startFrame);
        boundaries.add(clip.startFrame + clip.durationFrames);
      });
    });

    return [...boundaries].sort((a, b) => a - b);
  }, [layers]);

  // 再生ロジック: 30fps で currentFrame を自動更新
  const animate = useCallback(() => {
    const now = performance.now();

    if (!lastFrameTime.current) {
      lastFrameTime.current = now;
    }

    const elapsed = now - lastFrameTime.current;
    const frameDuration = 1000 / fps; // 1フレームあたりのミリ秒

    if (elapsed >= frameDuration) {
      dispatch((dispatch, getState) => {
        const state = getState();
        const { currentFrame, totalFrames, loopEnabled } = state.timeline;

        const nextFrame = currentFrame + 1;

        if (nextFrame >= totalFrames) {
          // 末尾到達時の処理
          if (loopEnabled) {
            // ループ有効: 先頭に戻る
            dispatch(setCurrentFrame(0));
          } else {
            // ループ無効: 停止
            dispatch(setCurrentFrame(totalFrames - 1));
            dispatch(setIsPlaying(false));
          }
        } else {
          dispatch(setCurrentFrame(nextFrame));
        }
      });

      lastFrameTime.current = now;
    }

    if (isPlaying) {
      animationFrameId.current = requestAnimationFrame(animate);
    }
  }, [dispatch, fps, isPlaying]);

  // 再生状態の変化を監視
  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = null;
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      lastFrameTime.current = null;
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, animate]);

  // ボタンハンドラー
  const handlePlayPause = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  const handleGoToStart = () => {
    dispatch(setCurrentFrame(0));
  };

  const handleGoToEnd = () => {
    dispatch(setCurrentFrame(totalFrames - 1));
  };

  const handleFrameBackward = () => {
    dispatch(setCurrentFrame(Math.max(0, currentFrame - 1)));
  };

  const handleFrameForward = () => {
    dispatch(setCurrentFrame(Math.min(totalFrames - 1, currentFrame + 1)));
  };

  const handleToggleLoop = () => {
    dispatch(setLoopEnabled(!loopEnabled));
  };

  const handleUndo = () => {
    if (canUndo) dispatch(undo());
  };

  const handleRedo = () => {
    if (canRedo) dispatch(redo());
  };

  // 前のクリップ境界へジャンプ
  const handlePreviousClip = () => {
    // 現在位置より前の境界点を探す（少し余裕を持たせて判定）
    const prev = clipBoundaries.filter((frame) => frame < currentFrame - 1).pop();
    if (prev !== undefined) {
      dispatch(setCurrentFrame(prev));
    } else {
      // 見つからない場合は先頭へ
      dispatch(setCurrentFrame(0));
    }
  };

  // 次のクリップ境界へジャンプ
  const handleNextClip = () => {
    // 現在位置より後の境界点を探す（少し余裕を持たせて判定）
    const next = clipBoundaries.find((frame) => frame > currentFrame + 1);
    if (next !== undefined) {
      dispatch(setCurrentFrame(next));
    } else {
      // 見つからない場合は末尾へ
      dispatch(setCurrentFrame(totalFrames - 1));
    }
  };

  return (
    <div className="flex items-center gap-2 bg-surface-raised px-4 py-2 border-b border-line">
      {/* 先頭へ移動 */}
      <button
        onClick={handleGoToStart}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="先頭へ移動 (Home)"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* 前のクリップへ */}
      <button
        onClick={handlePreviousClip}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="前のクリップへ"
      >
        <ChevronsLeft className="w-5 h-5" />
      </button>

      {/* 1フレーム戻る */}
      <button
        onClick={handleFrameBackward}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="前のフレーム (←)"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 再生/停止 */}
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 flex items-center justify-center rounded bg-accent-blue hover:bg-accent-blue/90 active:bg-accent-blue/80 transition-colors text-white"
        title="再生/一時停止 (Space)"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* 1フレーム進む */}
      <button
        onClick={handleFrameForward}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="次のフレーム (→)"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* 次のクリップへ */}
      <button
        onClick={handleNextClip}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="次のクリップへ"
      >
        <ChevronsRight className="w-5 h-5" />
      </button>

      {/* 末尾へ移動 */}
      <button
        onClick={handleGoToEnd}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="末尾へ移動 (End)"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-line mx-2" />

      {/* ループトグル */}
      <button
        onClick={handleToggleLoop}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
          loopEnabled
            ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
            : 'hover:bg-state-hover text-ink-secondary hover:text-ink-primary'
        }`}
        title="ループ切り替え (L)"
      >
        <Repeat className="w-4 h-4" />
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-line mx-2" />

      {/* Undo */}
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
          canUndo
            ? 'hover:bg-state-hover text-ink-secondary hover:text-ink-primary'
            : 'text-ink-muted cursor-not-allowed'
        }`}
        title="元に戻す (Cmd+Z)"
      >
        <Undo className="w-4 h-4" />
      </button>

      {/* Redo */}
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
          canRedo
            ? 'hover:bg-state-hover text-ink-secondary hover:text-ink-primary'
            : 'text-ink-muted cursor-not-allowed'
        }`}
        title="やり直す (Cmd+Shift+Z)"
      >
        <Redo className="w-4 h-4" />
      </button>

      {/* 再生情報 */}
      <div className="ml-4 text-xs text-ink-muted">
        {isPlaying && <span className="text-accent-green">● </span>}
        {isPlaying ? '再生中' : '停止中'}
        {loopEnabled && <span className="ml-2 text-accent-blue">(ループ)</span>}
      </div>
    </div>
  );
}

export default TransportControls;
