import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentFrame, addClip, clearSelection, addVideoLayer, addSoundLayer, removeLayer, removeClips, setPixelsPerFrame, saveToHistory, moveSelectedClipsToLayer } from '../../store/timelineSlice';
import Layer from './Layer';
import TransportControls from '../Controls/TransportControls';
import MarqueeSelection from './MarqueeSelection';
import ZoomControls from './ZoomControls';
import { Plus, Minus } from '../Icons';

// ファイル拡張子からクリップタイプを判定
const getClipTypeFromFile = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];

  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  if (audioExts.includes(ext)) return 'bgm';
  return 'video'; // デフォルト
};

// ファイルタイプに適したレイヤーを取得
const getTargetLayerId = (clipType, layers, layerOrder) => {
  if (clipType === 'bgm' || clipType === 'se') {
    // オーディオ系は S1 か S2
    return layerOrder.find((id) => layers[id].type === 'audio') || 'S1';
  }
  // ビデオ・画像系は V1 か V2
  return layerOrder.find((id) => layers[id].type === 'video') || 'V1';
};

// Constants for timeline height constraints
const MIN_TIMELINE_HEIGHT = 200; // Minimum height in pixels
const MAX_TIMELINE_HEIGHT = 600; // Maximum height in pixels
const DEFAULT_TIMELINE_HEIGHT = 256; // Default height (h-64 = 16rem = 256px)
const TIMELINE_HEIGHT_STORAGE_KEY = 'clip-composer-timeline-height';

function Timeline() {
  const dispatch = useDispatch();
  const {
    layers,
    layerOrder,
    currentFrame,
    totalFrames,
    fps,
    pixelsPerFrame,
    selectedClipIds,
  } = useSelector((state) => state.timeline);

  const timelineRef = useRef(null);
  const rulerRef = useRef(null);
  const timecodeInputRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [showTimecodeDialog, setShowTimecodeDialog] = useState(false);
  const [timecodeInput, setTimecodeInput] = useState('');

  // Timeline height state with localStorage persistence
  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = localStorage.getItem(TIMELINE_HEIGHT_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_TIMELINE_HEIGHT && parsed <= MAX_TIMELINE_HEIGHT) {
        return parsed;
      }
    }
    return DEFAULT_TIMELINE_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);

  // レイヤー表示順序をソート
  // Video: 番号が大きいほど上（V3, V2, V1）
  // Sound: 番号が小さいほど上（S1, S2, S3）
  const sortedLayerOrder = useMemo(() => {
    const videoLayers = layerOrder.filter(id => id.startsWith('V'));
    const soundLayers = layerOrder.filter(id => id.startsWith('S'));

    // Video: 降順ソート（番号が大きいものが先）
    videoLayers.sort((a, b) => {
      const numA = parseInt(a.slice(1)) || 0;
      const numB = parseInt(b.slice(1)) || 0;
      return numB - numA;
    });

    // Sound: 昇順ソート（番号が小さいものが先）
    soundLayers.sort((a, b) => {
      const numA = parseInt(a.slice(1)) || 0;
      const numB = parseInt(b.slice(1)) || 0;
      return numA - numB;
    });

    return [...videoLayers, ...soundLayers];
  }, [layerOrder]);

  // レイヤー削除可能かチェック（同タイプが2つ以上あれば削除可能）
  const canDeleteLayer = useCallback((layerId) => {
    const isVideo = layerId.startsWith('V');
    const sameTypeCount = Object.keys(layers).filter(id =>
      isVideo ? id.startsWith('V') : id.startsWith('S')
    ).length;
    return sameTypeCount > 1;
  }, [layers]);

  // レイヤー追加ハンドラー
  const handleAddVideoLayer = useCallback(() => {
    dispatch(addVideoLayer());
  }, [dispatch]);

  const handleAddSoundLayer = useCallback(() => {
    dispatch(addSoundLayer());
  }, [dispatch]);

  // レイヤー削除ハンドラー
  const handleRemoveLayer = useCallback((layerId) => {
    dispatch(removeLayer({ layerId }));
  }, [dispatch]);

  // 選択クリップを別レイヤーに移動
  const handleMoveToLayer = useCallback((targetLayerId) => {
    if (selectedClipIds.length === 0) return;
    dispatch(saveToHistory());
    dispatch(moveSelectedClipsToLayer({ targetLayerId }));
  }, [dispatch, selectedClipIds]);

  // 選択されたクリップがあるかどうか
  const hasSelectedClips = selectedClipIds.length > 0;

  // 選択中のクリップがあるレイヤータイプを取得（VideoかSoundか）
  const selectedClipLayerType = useMemo(() => {
    if (selectedClipIds.length === 0) return null;
    for (const layerId of Object.keys(layers)) {
      const layer = layers[layerId];
      for (const clip of layer.clips) {
        if (selectedClipIds.includes(clip.id)) {
          return layer.type;
        }
      }
    }
    return null;
  }, [selectedClipIds, layers]);

  // 移動可能なレイヤーリスト（同タイプのレイヤーのみ）
  const availableTargetLayers = useMemo(() => {
    if (!selectedClipLayerType) return [];
    return layerOrder
      .filter(id => layers[id].type === selectedClipLayerType)
      .map(id => ({ id, name: layers[id].name }));
  }, [selectedClipLayerType, layerOrder, layers]);

  // 外部ファイルドロップハンドラー（React DnDとの競合回避）
  const handleDragOver = useCallback((e) => {
    // 外部ファイルドラッグの場合のみ処理（React DnDはスルー）
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    // 外部ファイルドラッグの場合のみ処理
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    // 外部ファイルドラッグの場合のみ処理（React DnDはスルー）
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // ドロップ位置からフレームを計算
    const rect = timelineRef.current?.getBoundingClientRect();
    let dropFrame = 0;
    if (rect) {
      const x = e.clientX - rect.left - 80; // 80px はラベルエリア
      dropFrame = Math.max(0, Math.round(x / pixelsPerFrame));
    }

    // 履歴に保存
    dispatch(saveToHistory());

    // 各ファイルをクリップとして追加
    files.forEach((file, index) => {
      const clipType = getClipTypeFromFile(file.name);
      const targetLayerId = getTargetLayerId(clipType, layers, layerOrder);

      const newClip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: clipType,
        name: file.name,
        startFrame: dropFrame + index * 60, // 連続配置
        durationFrames: 90, // デフォルト3秒（30fps）
        filePath: file.path, // Electronではファイルパスが取得可能
      };

      dispatch(addClip({ layerId: targetLayerId, clip: newClip }));
    });
  }, [pixelsPerFrame, layers, layerOrder, dispatch]);

  // フレームをタイムコードに変換 (HH:MM:SS:FF)
  const frameToTimecode = (frame) => {
    const totalSeconds = Math.floor(frame / fps);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const frames = frame % fps;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  // タイムコードをフレームに変換
  const timecodeToFrame = useCallback((timecode) => {
    // 様々なフォーマットに対応: HH:MM:SS:FF, MM:SS:FF, SS:FF, FF, または秒数
    const trimmed = timecode.trim();

    // 秒数のみ入力（例: "5.5" -> 5.5秒）
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const seconds = parseFloat(trimmed);
      return Math.round(seconds * fps);
    }

    // コロン区切りのタイムコード
    const parts = trimmed.split(':').map(p => parseInt(p, 10) || 0);

    let hours = 0, minutes = 0, seconds = 0, frames = 0;

    if (parts.length === 4) {
      // HH:MM:SS:FF
      [hours, minutes, seconds, frames] = parts;
    } else if (parts.length === 3) {
      // MM:SS:FF
      [minutes, seconds, frames] = parts;
    } else if (parts.length === 2) {
      // 常に SS:FF として解釈（MM:SS が必要なら MM:SS:00 を使用）
      [seconds, frames] = parts;
    } else if (parts.length === 1) {
      // フレーム番号のみ
      frames = parts[0];
    }

    const totalFrames = ((hours * 3600 + minutes * 60 + seconds) * fps) + frames;
    return totalFrames;
  }, [fps]);

  // タイムコードダイアログを開く
  const handleOpenTimecodeDialog = useCallback(() => {
    setTimecodeInput(frameToTimecode(currentFrame));
    setShowTimecodeDialog(true);
  }, [currentFrame]);

  // タイムコードダイアログを閉じる
  const handleCloseTimecodeDialog = useCallback(() => {
    setShowTimecodeDialog(false);
  }, []);

  // タイムコードにジャンプ
  const handleTimecodeJump = useCallback(() => {
    const targetFrame = timecodeToFrame(timecodeInput);
    const clampedFrame = Math.max(0, Math.min(targetFrame, totalFrames));
    dispatch(setCurrentFrame(clampedFrame));
    setShowTimecodeDialog(false);
  }, [timecodeInput, timecodeToFrame, totalFrames, dispatch]);

  // タイムコード入力のキーハンドラー
  const handleTimecodeKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleTimecodeJump();
    } else if (e.key === 'Escape') {
      handleCloseTimecodeDialog();
    }
  }, [handleTimecodeJump, handleCloseTimecodeDialog]);

  // ダイアログ表示時に入力欄にフォーカス
  useEffect(() => {
    if (showTimecodeDialog && timecodeInputRef.current) {
      timecodeInputRef.current.focus();
      timecodeInputRef.current.select();
    }
  }, [showTimecodeDialog]);

  // 再生位置更新（ルーラー専用）
  const updatePlayheadPosition = useCallback((e) => {
    if (!rulerRef.current || !timelineRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft || 0;
    const x = e.clientX - rect.left + scrollLeft;
    const frame = Math.max(0, Math.min(Math.floor(x / pixelsPerFrame), totalFrames));
    dispatch(setCurrentFrame(frame));
  }, [dispatch, pixelsPerFrame, totalFrames]);

  // ルーラーのマウスダウン
  const handleRulerMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    updatePlayheadPosition(e);
  }, [updatePlayheadPosition]);

  // マウス移動（requestAnimationFrameでスロットリング）
  const handlePlayheadDrag = useCallback((e) => {
    if (!isDraggingPlayhead) return;
    requestAnimationFrame(() => {
      updatePlayheadPosition(e);
    });
  }, [isDraggingPlayhead, updatePlayheadPosition]);

  // マウスアップ
  const handlePlayheadDragEnd = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  // グローバルイベント（クリーンアップ必須）
  useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handlePlayheadDrag);
      window.addEventListener('mouseup', handlePlayheadDragEnd);
      return () => {
        window.removeEventListener('mousemove', handlePlayheadDrag);
        window.removeEventListener('mouseup', handlePlayheadDragEnd);
      };
    }
  }, [isDraggingPlayhead, handlePlayheadDrag, handlePlayheadDragEnd]);

  // グローバルAltキー状態追跡（Option+ドラッグ複製用）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') {
        window.__isAltPressed = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        window.__isAltPressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.__isAltPressed = false;
    };
  }, []);

  // Option+マウスホイールでズームイン/アウト
  const handleWheel = useCallback((e) => {
    // Option（Alt）キー押下中のみズーム処理
    if (!e.altKey) return;

    e.preventDefault();

    // ホイール方向でズーム（上:拡大、下:縮小）
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newPixelsPerFrame = Math.max(0.5, Math.min(20, pixelsPerFrame + delta));

    // ズーム時にマウス位置を保持するため、スクロール位置を調整
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollLeft = timelineRef.current.scrollLeft;
      const mouseFrame = (mouseX + scrollLeft) / pixelsPerFrame;

      // ズーム後のスクロール位置を計算
      const newScrollLeft = mouseFrame * newPixelsPerFrame - mouseX;

      dispatch(setPixelsPerFrame(newPixelsPerFrame));

      // スクロール位置を更新（次フレームで実行）
      requestAnimationFrame(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollLeft = newScrollLeft;
        }
      });
    } else {
      dispatch(setPixelsPerFrame(newPixelsPerFrame));
    }
  }, [pixelsPerFrame, dispatch]);

  // タイムラインにホイールイベントを追加
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    timeline.addEventListener('wheel', handleWheel, { passive: false });
    return () => timeline.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // 再生バー自動追従（画面外に出そうになったらスクロール）
  useEffect(() => {
    if (!timelineRef.current) return;

    const container = timelineRef.current;
    const playheadPosition = currentFrame * pixelsPerFrame;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    // マージン（端から何px以内で追従開始するか）
    const margin = 100;

    // 再生バーが右端に近づいた場合
    if (playheadPosition > scrollLeft + containerWidth - margin) {
      // 再生バーが画面の1/3位置になるようにスクロール
      container.scrollLeft = playheadPosition - containerWidth / 3;
    }
    // 再生バーが左端より左にある場合
    else if (playheadPosition < scrollLeft + margin) {
      // 再生バーが画面の2/3位置になるようにスクロール
      container.scrollLeft = Math.max(0, playheadPosition - containerWidth * 2 / 3);
    }
  }, [currentFrame, pixelsPerFrame]);

  // Timeline resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    // Calculate new height based on mouse position (dragging up increases height)
    const newHeight = containerRect.bottom - e.clientY;
    const clampedHeight = Math.max(MIN_TIMELINE_HEIGHT, Math.min(MAX_TIMELINE_HEIGHT, newHeight));

    setTimelineHeight(clampedHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      // Save to localStorage
      localStorage.setItem(TIMELINE_HEIGHT_STORAGE_KEY, timelineHeight.toString());
    }
  }, [isResizing, timelineHeight]);

  // Global mouse events for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';

      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // 背景クリックで選択解除
  const handleBackgroundClick = useCallback((e) => {
    // クリップやルーラー上のクリックは無視
    if (e.target.closest('[data-clip]') || e.target.closest('[data-ruler]')) return;
    // マーキー選択直後は選択解除をスキップ
    if (window.__justFinishedMarquee) return;
    dispatch(clearSelection());
  }, [dispatch]);

  // タイムルーラーの描画
  const renderTimeRuler = () => {
    const marks = [];
    const secondWidth = fps * pixelsPerFrame;
    const totalSeconds = Math.ceil(totalFrames / fps);

    for (let i = 0; i <= totalSeconds; i++) {
      const isMainMark = i % 5 === 0;
      marks.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${i * secondWidth}px` }}
        >
          <div
            className={`w-px ${isMainMark ? 'h-4 bg-line' : 'h-2 bg-line-subtle'}`}
          />
          {isMainMark && (
            <span className="text-xs text-ink-secondary mt-1">{i}s</span>
          )}
        </div>
      );
    }
    return marks;
  };

  const timelineWidth = totalFrames * pixelsPerFrame;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-surface-sunken border-t border-line relative ${
        isDragOver ? 'ring-2 ring-accent-blue ring-inset' : ''
      }`}
      style={{ height: `${timelineHeight}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Resize Handle */}
      <div
        className={`absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20 group flex items-center justify-center
          ${isResizing ? 'bg-accent-blue/30' : 'hover:bg-line/50'}`}
        onMouseDown={handleResizeStart}
      >
        {/* Visible grip indicator */}
        <div className={`w-12 h-1 rounded-full transition-colors
          ${isResizing ? 'bg-accent-blue' : 'bg-line group-hover:bg-ink-muted'}`}
        />
      </div>

      {/* トランスポートコントロール */}
      <TransportControls />

      {/* ヘッダー: タイムコード表示 */}
      <div className="flex items-center h-8 bg-surface-raised border-b border-line px-4">
        <div className="w-20 text-sm text-ink-secondary">時間:</div>
        <button
          onClick={handleOpenTimecodeDialog}
          className="font-mono text-sm text-ink-primary hover:text-accent-blue hover:bg-state-hover px-2 py-0.5 rounded transition-colors cursor-pointer"
          title="クリックしてタイムコードを入力"
        >
          {frameToTimecode(currentFrame)}
        </button>
        <div className="ml-4 text-xs text-ink-secondary">
          フレーム: {currentFrame} / {totalFrames}
        </div>

        {/* 選択クリップのレイヤー移動UI */}
        {hasSelectedClips && availableTargetLayers.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-secondary">
              {selectedClipIds.length}個選択中
            </span>
            <span className="text-xs text-ink-muted">→</span>
            <select
              className="px-2 py-0.5 text-xs bg-surface-sunken border border-line rounded text-ink-primary focus:outline-none focus:border-accent-blue"
              onChange={(e) => handleMoveToLayer(e.target.value)}
              value=""
            >
              <option value="" disabled>レイヤーに移動...</option>
              {availableTargetLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* タイムコードジャンプダイアログ */}
      {showTimecodeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseTimecodeDialog}>
          <div className="bg-surface-highest rounded-lg shadow-xl p-4 min-w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-ink-primary mb-3">タイムコードにジャンプ</h3>
            <div className="mb-4">
              <input
                ref={timecodeInputRef}
                type="text"
                value={timecodeInput}
                onChange={(e) => setTimecodeInput(e.target.value)}
                onKeyDown={handleTimecodeKeyDown}
                className="w-full px-3 py-2 bg-surface-sunken border border-line rounded text-ink-primary font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="00:00:00:00"
              />
              <p className="text-xs text-ink-muted mt-2">
                形式: HH:MM:SS:FF / MM:SS:FF / SS:FF / 秒数 / フレーム番号
              </p>
              <p className="text-xs text-ink-muted mt-1">
                ※ 2要素入力は SS:FF（秒:フレーム）として解釈されます
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseTimecodeDialog}
                className="px-3 py-1.5 text-sm text-ink-secondary hover:bg-state-hover rounded transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleTimecodeJump}
                className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded hover:bg-accent-blue/90 transition-colors"
              >
                ジャンプ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タイムライン本体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* レイヤーラベル */}
        <div className="w-20 flex-shrink-0 bg-surface-raised border-r border-line">
          {/* タイムルーラー用スペース + Video追加ボタン */}
          <div className="h-6 border-b border-line flex items-center justify-end px-1">
            <button
              onClick={handleAddVideoLayer}
              className="w-4 h-4 flex items-center justify-center text-ink-muted hover:text-accent-blue hover:bg-state-hover rounded transition-colors"
              title="Videoレイヤーを追加"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {/* レイヤー名 */}
          {sortedLayerOrder.map((layerId, index) => {
            const isVideo = layerId.startsWith('V');
            const nextLayerId = sortedLayerOrder[index + 1];
            const isLastVideo = isVideo && (!nextLayerId || nextLayerId.startsWith('S'));

            return (
              <React.Fragment key={layerId}>
                <div className="h-12 flex items-center justify-between px-2 border-b border-line hover:bg-state-hover group">
                  <span className="text-xs font-medium text-ink-secondary">
                    {layers[layerId].name}
                  </span>
                  {/* 削除ボタン（ホバー時のみ表示、削除可能な場合のみ） */}
                  {canDeleteLayer(layerId) && (
                    <button
                      onClick={() => handleRemoveLayer(layerId)}
                      className="w-4 h-4 flex items-center justify-center text-ink-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`${layers[layerId].name}を削除`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* VideoレイヤーとSoundレイヤーの間にSound追加ボタン */}
                {isLastVideo && (
                  <div className="h-6 border-b border-line flex items-center justify-end px-1 bg-surface-sunken">
                    <button
                      onClick={handleAddSoundLayer}
                      className="w-4 h-4 flex items-center justify-center text-ink-muted hover:text-accent-blue hover:bg-state-hover rounded transition-colors"
                      title="Soundレイヤーを追加"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* タイムラインスクロールエリア */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onClick={handleBackgroundClick}
        >
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          >
            {/* タイムルーラー（再生バー操作可能エリア） */}
            <div
              ref={rulerRef}
              data-ruler="true"
              className="h-6 relative bg-surface-sunken border-b border-line cursor-pointer"
              onMouseDown={handleRulerMouseDown}
            >
              {renderTimeRuler()}
            </div>

            {/* レイヤー */}
            {sortedLayerOrder.map((layerId, index) => {
              const isVideo = layerId.startsWith('V');
              const nextLayerId = sortedLayerOrder[index + 1];
              const isLastVideo = isVideo && (!nextLayerId || nextLayerId.startsWith('S'));

              return (
                <React.Fragment key={layerId}>
                  <Layer
                    layerId={layerId}
                    layer={layers[layerId]}
                    pixelsPerFrame={pixelsPerFrame}
                  />
                  {/* VideoとSoundの間のスペーサー（追加ボタン行に対応） */}
                  {isLastVideo && (
                    <div className="h-6 border-b border-line bg-surface-sunken" />
                  )}
                </React.Fragment>
              );
            })}

            {/* マーキー選択 */}
            <MarqueeSelection
              timelineRef={timelineRef}
              layers={layers}
              layerOrder={sortedLayerOrder}
              pixelsPerFrame={pixelsPerFrame}
            />

            {/* 再生ヘッド */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent-red pointer-events-none z-10"
              style={{ left: `${currentFrame * pixelsPerFrame}px` }}
            >
              {/* 再生ヘッドのつまみ */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent-red rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ズームコントロール */}
      <ZoomControls timelineRef={timelineRef} />

      {/* ドラッグオーバー時のオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 bg-accent-blue/20 pointer-events-none flex items-center justify-center">
          <div className="bg-surface-raised px-4 py-2 rounded-lg text-white text-sm">
            ファイルをドロップして追加
          </div>
        </div>
      )}
    </div>
  );
}

export default Timeline;
