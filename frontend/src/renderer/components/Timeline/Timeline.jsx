import React, { useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentFrame, addClip } from '../../store/timelineSlice';
import Layer from './Layer';
import TransportControls from '../Controls/TransportControls';

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
  } = useSelector((state) => state.timeline);

  const timelineRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 外部ファイルドロップハンドラー
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
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

  // タイムラインクリックで再生ヘッド移動
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft - 80; // 80px はラベルエリア
    const frame = Math.max(0, Math.min(Math.floor(x / pixelsPerFrame), totalFrames));
    dispatch(setCurrentFrame(frame));
  };

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
            className={`w-px ${isMainMark ? 'h-4 bg-gray-400' : 'h-2 bg-gray-600'}`}
          />
          {isMainMark && (
            <span className="text-xs text-gray-400 mt-1">{i}s</span>
          )}
        </div>
      );
    }
    return marks;
  };

  const timelineWidth = totalFrames * pixelsPerFrame;

  return (
    <div
      className={`flex flex-col h-64 bg-gray-900 border-t border-gray-700 ${
        isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* トランスポートコントロール */}
      <TransportControls />

      {/* ヘッダー: タイムコード表示 */}
      <div className="flex items-center h-8 bg-gray-800 border-b border-gray-700 px-4">
        <div className="w-20 text-sm text-gray-400">Time:</div>
        <div className="font-mono text-sm text-white">
          {frameToTimecode(currentFrame)}
        </div>
        <div className="ml-4 text-xs text-gray-500">
          Frame: {currentFrame} / {totalFrames}
        </div>
      </div>

      {/* タイムライン本体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* レイヤーラベル */}
        <div className="w-20 flex-shrink-0 bg-gray-800 border-r border-gray-700">
          {/* タイムルーラー用スペース */}
          <div className="h-6 border-b border-gray-700" />
          {/* レイヤー名 */}
          {layerOrder.map((layerId) => (
            <div
              key={layerId}
              className={`h-12 flex items-center px-2 border-b border-gray-700 ${
                layers[layerId].type === 'video'
                  ? 'bg-blue-900/30'
                  : 'bg-purple-900/30'
              }`}
            >
              <span className="text-xs font-medium text-gray-300">
                {layers[layerId].name}
              </span>
            </div>
          ))}
        </div>

        {/* タイムラインスクロールエリア */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
        >
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          >
            {/* タイムルーラー */}
            <div className="h-6 relative bg-gray-800 border-b border-gray-700">
              {renderTimeRuler()}
            </div>

            {/* レイヤー */}
            {layerOrder.map((layerId) => (
              <Layer
                key={layerId}
                layerId={layerId}
                layer={layers[layerId]}
                pixelsPerFrame={pixelsPerFrame}
              />
            ))}

            {/* 再生ヘッド */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{ left: `${currentFrame * pixelsPerFrame}px` }}
            >
              {/* 再生ヘッドのつまみ */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ドラッグオーバー時のオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none flex items-center justify-center">
          <div className="bg-gray-800 px-4 py-2 rounded-lg text-white text-sm">
            ファイルをドロップして追加
          </div>
        </div>
      )}
    </div>
  );
}

export default Timeline;
