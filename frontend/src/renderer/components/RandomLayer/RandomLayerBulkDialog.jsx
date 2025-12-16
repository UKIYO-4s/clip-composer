import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers, saveToHistory, selectResolution, selectFps } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// アスペクト比プリセット
const ASPECT_RATIO_PRESETS = [
  { id: '16:9', label: '16:9 横', width: 16, height: 9 },
  { id: '9:16', label: '9:16 縦', width: 9, height: 16 },
  { id: '4:3', label: '4:3', width: 4, height: 3 },
  { id: '1:1', label: '1:1 正方形', width: 1, height: 1 },
  { id: 'custom', label: 'カスタム', width: 16, height: 9 },
];

const RandomLayerBulkDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);
  const resolution = useSelector(selectResolution);
  const fps = useSelector(selectFps);

  // ビデオレイヤーのみ抽出（useEffectより先に定義）
  const layerOptions = useMemo(() =>
    layerOrder
      .filter(id => id.startsWith('V'))
      .map(layerId => ({
        value: layerId,
        label: layers[layerId]?.name || layerId
      })),
    [layerOrder, layers]
  );

  // 設定状態
  const [clipCount, setClipCount] = useState(10);
  const [clipDuration, setClipDuration] = useState(60); // フレーム
  const [targetLayer, setTargetLayer] = useState('V1');
  const [startPosition, setStartPosition] = useState('current'); // 'current', 'start', 'end', 'custom'
  const [customStartFrame, setCustomStartFrame] = useState(0);
  const [placementMode, setPlacementMode] = useState('continuous'); // 'continuous', 'spaced'
  const [gapFrames, setGapFrames] = useState(0);
  const [folderPath, setFolderPath] = useState('');
  const [selectionMode, setSelectionMode] = useState('shuffle'); // 'shuffle'(ランダム), 'sequential'(順番)
  const [errorMessage, setErrorMessage] = useState('');

  // 位置・スケール設定
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [scale, setScale] = useState(100); // パーセント

  // アスペクト比プレビュー設定
  const [aspectRatioPreset, setAspectRatioPreset] = useState('16:9');
  const [customAspectWidth, setCustomAspectWidth] = useState(16);
  const [customAspectHeight, setCustomAspectHeight] = useState(9);

  // ダイアログを開くたびに初期化して、前回の設定が残らないようにする
  useEffect(() => {
    if (isOpen) {
      setClipCount(10);
      setClipDuration(60);
      setTargetLayer(layerOptions[0]?.value || 'V1');
      setStartPosition('current');
      setCustomStartFrame(0);
      setPlacementMode('continuous');
      setGapFrames(0);
      setFolderPath('');
      setSelectionMode('shuffle');
      setErrorMessage('');
      setPositionX(0);
      setPositionY(0);
      setScale(100);
      setAspectRatioPreset('16:9');
      setCustomAspectWidth(16);
      setCustomAspectHeight(9);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 開始位置を計算
  const calculateStartFrame = useCallback(() => {
    switch (startPosition) {
      case 'current':
        return currentFrame;
      case 'start':
        return 0;
      case 'end': {
        const layer = layers[targetLayer];
        if (!layer || layer.clips.length === 0) return 0;
        const lastClip = layer.clips.reduce((max, clip) =>
          clip.startFrame + clip.durationFrames > max.startFrame + max.durationFrames ? clip : max
        );
        return lastClip.startFrame + lastClip.durationFrames;
      }
      case 'custom':
        return customStartFrame;
      default:
        return currentFrame;
    }
  }, [startPosition, currentFrame, layers, targetLayer, customStartFrame]);

  // 配置プレビュー情報
  const previewInfo = useMemo(() => {
    const start = calculateStartFrame();
    const gap = placementMode === 'continuous' ? 0 : gapFrames;
    const totalFrames = clipCount * clipDuration + (clipCount - 1) * gap;
    const endFrame = start + totalFrames;
    return {
      startFrame: start,
      endFrame: endFrame,
      totalFrames: totalFrames,
      totalSeconds: (totalFrames / fps).toFixed(2),
    };
  }, [calculateStartFrame, clipCount, clipDuration, placementMode, gapFrames, fps]);

  // 現在のアスペクト比を取得
  const currentAspectRatio = useMemo(() => {
    if (aspectRatioPreset === 'custom') {
      return { width: customAspectWidth || 16, height: customAspectHeight || 9 };
    }
    const preset = ASPECT_RATIO_PRESETS.find(p => p.id === aspectRatioPreset);
    return { width: preset?.width || 16, height: preset?.height || 9 };
  }, [aspectRatioPreset, customAspectWidth, customAspectHeight]);

  // ビジュアルプレビューの計算
  const visualPreview = useMemo(() => {
    const canvasW = resolution?.width || 1080;
    const canvasH = resolution?.height || 1920;
    const aspectW = currentAspectRatio.width;
    const aspectH = currentAspectRatio.height;
    const scaleVal = scale / 100;

    // 素材のベースサイズ（キャンバス幅に合わせる想定）
    let videoW = canvasW;
    let videoH = (canvasW / aspectW) * aspectH;

    // スケール適用
    videoW *= scaleVal;
    videoH *= scaleVal;

    // 位置計算（0,0がキャンバス中央）
    const videoCenterX = canvasW / 2 + positionX;
    const videoCenterY = canvasH / 2 + positionY;
    const videoLeft = videoCenterX - videoW / 2;
    const videoTop = videoCenterY - videoH / 2;

    return {
      canvasW,
      canvasH,
      videoW,
      videoH,
      videoLeft,
      videoTop,
      videoCenterX,
      videoCenterY,
    };
  }, [resolution, currentAspectRatio, scale, positionX, positionY]);

  // 一括配置実行
  const handleBulkPlace = useCallback(() => {
    // バリデーション
    if (!folderPath || folderPath.trim() === '') {
      setErrorMessage('素材フォルダを選択してください');
      return;
    }
    if (!clipCount || clipCount === '' || clipCount <= 0) {
      setErrorMessage('クリップ数を入力してください');
      return;
    }
    if (!clipDuration || clipDuration === '' || clipDuration <= 0) {
      setErrorMessage('各クリップの長さを入力してください');
      return;
    }

    // エラーをクリア
    setErrorMessage('');

    // 履歴に保存
    dispatch(saveToHistory());

    let currentFramePos = calculateStartFrame();
    const gap = placementMode === 'continuous' ? 0 : gapFrames;

    for (let i = 0; i < clipCount; i++) {
      const clipData = {
        id: generateId(),
        type: 'random_layer',
        name: `ランダム ${i + 1}`,
        startFrame: currentFramePos,
        durationFrames: clipDuration,
        opacity: 100,
        // 位置・スケール（scaleはパーセント値のまま保存、レンダラーが100で割る）
        positionX: positionX,
        positionY: positionY,
        scale: scale,
        // ランダムレイヤー固有プロパティ
        folderPath: folderPath,
        selectionMode: selectionMode,
        extensions: '.mp4,.mov,.avi',
        fileLimit: 0,
        randomSeed: Math.random(), // 各クリップで異なるランダムシード
      };

      dispatch(addClip({ layerId: targetLayer, clip: clipData }));

      currentFramePos += clipDuration + gap;
    }

    onClose();
  }, [dispatch, calculateStartFrame, clipCount, clipDuration, placementMode, gapFrames, targetLayer, folderPath, selectionMode, positionX, positionY, scale, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[520px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">ランダムレイヤー一括配置</h2>
          <IconButton
            icon={X}
            onClick={onClose}
            size="sm"
            variant="ghost"
            aria-label="閉じる"
          />
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* ソースフォルダ */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">素材フォルダパス</label>
            <Input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/path/to/videos"
            />
          </div>

          {/* 選択モード */}
          <Select
            label="素材選択モード"
            value={selectionMode}
            onChange={(e) => setSelectionMode(e.target.value)}
            options={[
              { value: 'shuffle', label: 'ランダム' },
              { value: 'sequential', label: '順番' },
            ]}
          />

          {/* クリップ数と長さ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">クリップ数</label>
              <Input
                type="number"
                value={clipCount === '' ? '' : clipCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setClipCount('');
                  } else {
                    setClipCount(Math.max(1, parseInt(val) || 1));
                  }
                }}
                min={1}
                max={100}
                placeholder="10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">各クリップの長さ（フレーム）</label>
              <Input
                type="number"
                value={clipDuration === '' ? '' : clipDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setClipDuration('');
                  } else {
                    setClipDuration(Math.max(1, parseInt(val) || 1));
                  }
                }}
                min={1}
                placeholder="60"
              />
              <span className="text-xs text-ink-muted">
                {clipDuration ? `${(clipDuration / fps).toFixed(2)}秒 @ ${fps}fps` : ''}
              </span>
            </div>
          </div>

          {/* 配置先レイヤー */}
          <Select
            label="配置先レイヤー"
            value={targetLayer}
            onChange={(e) => setTargetLayer(e.target.value)}
            options={layerOptions}
          />

          {/* 開始位置 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-secondary">開始位置</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'current', label: '現在位置' },
                { value: 'start', label: '先頭' },
                { value: 'end', label: '末尾' },
                { value: 'custom', label: '指定位置' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="startPosition"
                    value={opt.value}
                    checked={startPosition === opt.value}
                    onChange={(e) => setStartPosition(e.target.value)}
                    className="accent-accent-blue"
                  />
                  <span className="text-sm text-ink-primary">{opt.label}</span>
                </label>
              ))}
            </div>
            {startPosition === 'custom' && (
              <Input
                type="number"
                value={customStartFrame}
                onChange={(e) => setCustomStartFrame(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                placeholder="開始フレーム"
              />
            )}
          </div>

          {/* 配置方法 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-secondary">配置方法</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="placementMode"
                  value="continuous"
                  checked={placementMode === 'continuous'}
                  onChange={(e) => setPlacementMode(e.target.value)}
                  className="accent-accent-blue"
                />
                <span className="text-sm text-ink-primary">連続配置（隙間なし）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="placementMode"
                  value="spaced"
                  checked={placementMode === 'spaced'}
                  onChange={(e) => setPlacementMode(e.target.value)}
                  className="accent-accent-blue"
                />
                <span className="text-sm text-ink-primary">等間隔配置</span>
              </label>
            </div>
            {placementMode === 'spaced' && (
              <div className="flex items-center gap-2 ml-6">
                <Input
                  type="number"
                  value={gapFrames}
                  onChange={(e) => setGapFrames(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-24"
                />
                <span className="text-sm text-ink-muted">フレーム間隔</span>
              </div>
            )}
          </div>

          {/* 位置・スケール設定 + ビジュアルプレビュー */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-ink-secondary">配置シミュレーション</label>

            {/* アスペクト比プリセット */}
            <div className="space-y-2">
              <label className="text-xs text-ink-muted">素材のアスペクト比（仮）</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setAspectRatioPreset(preset.id)}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      aspectRatioPreset === preset.id
                        ? 'bg-accent-blue text-white border-accent-blue'
                        : 'bg-surface-base border-line text-ink-primary hover:bg-state-hover'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {aspectRatioPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={customAspectWidth}
                    onChange={(e) => setCustomAspectWidth(Math.max(1, parseInt(e.target.value) || 16))}
                    min={1}
                    className="w-16"
                  />
                  <span className="text-ink-muted">:</span>
                  <Input
                    type="number"
                    value={customAspectHeight}
                    onChange={(e) => setCustomAspectHeight(Math.max(1, parseInt(e.target.value) || 9))}
                    min={1}
                    className="w-16"
                  />
                </div>
              )}
            </div>

            {/* 配置プリセット */}
            <div className="space-y-2">
              <label className="text-xs text-ink-muted">配置プリセット</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setPositionX(0); setPositionY(0); setScale(100); }}
                  className="px-2 py-1 text-xs rounded border border-line bg-surface-base hover:bg-state-hover text-ink-primary"
                >
                  中央
                </button>
                <button
                  onClick={() => {
                    const canvasH = resolution?.height || 1920;
                    setPositionX(0);
                    setPositionY(-Math.round(canvasH / 3));
                    setScale(100);
                  }}
                  className="px-2 py-1 text-xs rounded border border-line bg-surface-base hover:bg-state-hover text-ink-primary"
                >
                  上1/3
                </button>
                <button
                  onClick={() => {
                    const canvasH = resolution?.height || 1920;
                    setPositionX(0);
                    setPositionY(Math.round(canvasH / 3));
                    setScale(100);
                  }}
                  className="px-2 py-1 text-xs rounded border border-line bg-surface-base hover:bg-state-hover text-ink-primary"
                >
                  下1/3
                </button>
                <button
                  onClick={() => { setPositionX(0); setPositionY(0); setScale(50); }}
                  className="px-2 py-1 text-xs rounded border border-line bg-surface-base hover:bg-state-hover text-ink-primary"
                >
                  中央50%
                </button>
                <button
                  onClick={() => { setPositionX(0); setPositionY(0); setScale(33); }}
                  className="px-2 py-1 text-xs rounded border border-line bg-surface-base hover:bg-state-hover text-ink-primary"
                >
                  中央33%
                </button>
              </div>
            </div>

            {/* 位置・スケール入力 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted">X座標</label>
                <Input
                  type="number"
                  value={positionX}
                  onChange={(e) => setPositionX(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-muted">Y座標</label>
                <Input
                  type="number"
                  value={positionY}
                  onChange={(e) => setPositionY(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-muted">スケール</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={scale}
                    onChange={(e) => setScale(Math.max(1, parseInt(e.target.value) || 100))}
                    min={1}
                    max={500}
                    placeholder="100"
                  />
                  <span className="text-xs text-ink-muted">%</span>
                </div>
              </div>
            </div>

            {/* ビジュアルプレビュー */}
            <div className="p-3 bg-surface-sunken rounded border border-line">
              <div className="flex gap-4">
                {/* キャンバスプレビュー */}
                <div
                  className="relative bg-black border border-line flex-shrink-0"
                  style={{
                    width: 120,
                    height: 120 * (visualPreview.canvasH / visualPreview.canvasW),
                  }}
                >
                  {/* ガイドライン（中央） */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />

                  {/* 素材プレビュー */}
                  <div
                    className="absolute bg-accent-blue/60 border-2 border-accent-blue"
                    style={{
                      width: `${(visualPreview.videoW / visualPreview.canvasW) * 100}%`,
                      height: `${(visualPreview.videoH / visualPreview.canvasH) * 100}%`,
                      left: `${(visualPreview.videoLeft / visualPreview.canvasW) * 100}%`,
                      top: `${(visualPreview.videoTop / visualPreview.canvasH) * 100}%`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] text-white font-medium">
                        {currentAspectRatio.width}:{currentAspectRatio.height}
                      </span>
                    </div>
                  </div>

                  {/* キャンバスサイズ表示 */}
                  <div className="absolute bottom-0.5 right-0.5 text-[8px] text-white/50">
                    {visualPreview.canvasW}x{visualPreview.canvasH}
                  </div>
                </div>

                {/* 情報 */}
                <div className="text-xs text-ink-muted space-y-1 flex-1">
                  <div className="font-medium text-ink-secondary mb-2">配置情報</div>
                  <div>キャンバス: {visualPreview.canvasW} x {visualPreview.canvasH}</div>
                  <div>素材サイズ: {Math.round(visualPreview.videoW)} x {Math.round(visualPreview.videoH)}</div>
                  <div>位置: ({positionX}, {positionY})</div>
                  <div>スケール: {scale}%</div>
                  <div className="pt-2 border-t border-line mt-2">
                    <div>総クリップ数: {clipCount}</div>
                    <div>総時間: {previewInfo.totalSeconds}秒</div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-ink-muted mt-2">
                ※ X/Y: 0が中央。正の値で右/下、負の値で左/上に移動
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-line space-y-2">
          {/* エラーメッセージ */}
          {errorMessage && (
            <div className="text-sm text-red-500 font-medium">
              {errorMessage}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="subtle" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleBulkPlace}>
              配置実行
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomLayerBulkDialog;
