import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentFrame,
  setIsPlaying,
  setLoopEnabled,
} from '../../store/timelineSlice';

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
    <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 border-b border-gray-700">
      {/* 先頭へ移動 */}
      <button
        onClick={handleGoToStart}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 active:bg-gray-600 transition-colors"
        title="Go to start (Home)"
      >
        <span className="text-lg">⏮</span>
      </button>

      {/* 1フレーム戻る */}
      <button
        onClick={handleFrameBackward}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 active:bg-gray-600 transition-colors"
        title="Previous frame (←)"
      >
        <span className="text-lg">⏪</span>
      </button>

      {/* 再生/停止 */}
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
        title="Play/Pause (Space)"
      >
        <span className="text-xl">
          {isPlaying ? '⏸' : '▶'}
        </span>
      </button>

      {/* 1フレーム進む */}
      <button
        onClick={handleFrameForward}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 active:bg-gray-600 transition-colors"
        title="Next frame (→)"
      >
        <span className="text-lg">⏩</span>
      </button>

      {/* 末尾へ移動 */}
      <button
        onClick={handleGoToEnd}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 active:bg-gray-600 transition-colors"
        title="Go to end (End)"
      >
        <span className="text-lg">⏭</span>
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-gray-600 mx-2" />

      {/* ループトグル */}
      <button
        onClick={handleToggleLoop}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
          loopEnabled
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'hover:bg-gray-700'
        }`}
        title="Toggle loop (L)"
      >
        <span className="text-lg">🔁</span>
      </button>

      {/* 再生情報 */}
      <div className="ml-4 text-xs text-gray-400">
        {isPlaying && <span className="text-green-500">● </span>}
        {isPlaying ? 'Playing' : 'Stopped'}
        {loopEnabled && <span className="ml-2 text-blue-400">(Loop)</span>}
      </div>
    </div>
  );
}

export default TransportControls;
