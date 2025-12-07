import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentFrame, addClip, clearSelection, addVideoLayer, addSoundLayer, removeLayer, removeClips } from '../../store/timelineSlice';
import Layer from './Layer';
import TransportControls from '../Controls/TransportControls';
import MarqueeSelection from './MarqueeSelection';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

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

  // Delete/Backspace キーで選択クリップを削除
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete または Backspace キー
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        // テキスト入力中は無視
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        dispatch(removeClips({ clipIds: selectedClipIds }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, dispatch]);

  // 背景クリックで選択解除
  const handleBackgroundClick = useCallback((e) => {
    // クリップやルーラー上のクリックは無視
    if (e.target.closest('[data-clip]') || e.target.closest('[data-ruler]')) return;
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
      className={`flex flex-col h-64 bg-surface-sunken border-t border-line ${
        isDragOver ? 'ring-2 ring-accent-blue ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* トランスポートコントロール */}
      <TransportControls />

      {/* ヘッダー: タイムコード表示 */}
      <div className="flex items-center h-8 bg-surface-raised border-b border-line px-4">
        <div className="w-20 text-sm text-ink-secondary">時間:</div>
        <div className="font-mono text-sm text-ink-primary">
          {frameToTimecode(currentFrame)}
        </div>
        <div className="ml-4 text-xs text-ink-secondary">
          フレーム: {currentFrame} / {totalFrames}
        </div>
      </div>

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
