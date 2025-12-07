import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentFrame,
  setIsPlaying,
  setLoopEnabled,
} from '../../store/timelineSlice';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
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

  const animationFrameId = useRef(null);
  const lastFrameTime = useRef(null);

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

  return (
    <div className="flex items-center gap-2 bg-surface-raised px-4 py-2 border-b border-line">
      {/* 先頭へ移動 */}
      <button
        onClick={handleGoToStart}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="Go to start (Home)"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* 1フレーム戻る */}
      <button
        onClick={handleFrameBackward}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="Previous frame (←)"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 再生/停止 */}
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 flex items-center justify-center rounded bg-accent-blue hover:bg-accent-blue/90 active:bg-accent-blue/80 transition-colors text-white"
        title="Play/Pause (Space)"
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
        title="Next frame (→)"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* 末尾へ移動 */}
      <button
        onClick={handleGoToEnd}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-state-hover active:bg-state-active transition-colors text-ink-secondary hover:text-ink-primary"
        title="Go to end (End)"
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
        title="Toggle loop (L)"
      >
        <Repeat className="w-4 h-4" />
      </button>

      {/* 再生情報 */}
      <div className="ml-4 text-xs text-ink-muted">
        {isPlaying && <span className="text-accent-green">● </span>}
        {isPlaying ? 'Playing' : 'Stopped'}
        {loopEnabled && <span className="ml-2 text-accent-blue">(Loop)</span>}
      </div>
    </div>
  );
}

export default TransportControls;
