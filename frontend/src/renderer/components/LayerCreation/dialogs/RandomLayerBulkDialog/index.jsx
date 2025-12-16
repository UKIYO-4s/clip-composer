import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers, saveToHistory, selectResolution } from '../../../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../../../ui';
import { X } from '../../../Icons';
import InputModeSelector from './InputModeSelector';
import SelectionModeSelect from './SelectionModeHelp';
import { useClipCalculation } from '../../../../hooks/useClipCalculation';
import { useFolderSelection } from '../../../../hooks';
import { FolderSelector } from '../../../FolderSelector';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// アスペクト比プリセット
const ASPECT_RATIO_PRESETS = [
  { id: '16:9', label: '16:9 横', width: 16, height: 9 },
  { id: '9:16', label: '9:16 縦', width: 9, height: 16 },
  { id: '4:3', label: '4:3', width: 4, height: 3 },
  { id: '1:1', label: '1:1 正方形', width: 1, height: 1 },
  { id: 'custom', label: 'カスタム', width: 16, height: 9 },
];

// プレビュー色のパレット
const PREVIEW_COLORS = [
  '#22C55E', // green
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// 素材タイプに応じた拡張子リストを取得
const getExtensionsForMediaType = (type, includeGif) => {
  const video = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
  const image = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  const gifExt = includeGif ? ['.gif'] : [];

  if (type === 'video_only') return video;
  if (type === 'image_only') return [...image, ...gifExt];
  if (type === 'both') return [...video, ...image, ...gifExt];
  return video;
};

const RandomLayerBulkDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);
  const fps = useSelector((state) => state.timeline.fps);
  const resolution = useSelector(selectResolution);

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

  // 入力モード
  const [inputMode, setInputMode] = useState('clipDuration');
  const [inputValues, setInputValues] = useState({
    clipCount: 15,
    clipDuration: 60, // フレーム
    totalDuration: 3, // 秒
  });

  // 選択モード（shuffleがデフォルト、UIでは「ランダム」と表示）
  const [selectionMode, setSelectionMode] = useState('shuffle');

  // 素材タイプ（新規）
  const [mediaType, setMediaType] = useState('video_only');
  const [includeGif, setIncludeGif] = useState(false);

  // 配置設定
  const [targetLayer, setTargetLayer] = useState('V1');
  const [startPosition, setStartPosition] = useState('current');
  const [customStartFrame, setCustomStartFrame] = useState(0);
  const [placementMode, setPlacementMode] = useState('continuous');
  const [gapFrames, setGapFrames] = useState(0);

  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState('');

  // 位置・スケール設定
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [scale, setScale] = useState(100);

  // アスペクト比プレビュー設定
  const [aspectRatioPreset, setAspectRatioPreset] = useState('16:9');
  const [customAspectWidth, setCustomAspectWidth] = useState(16);
  const [customAspectHeight, setCustomAspectHeight] = useState(9);

  // 素材タイプに応じた拡張子リスト
  const currentExtensions = useMemo(
    () => getExtensionsForMediaType(mediaType, includeGif),
    [mediaType, includeGif]
  );

  // フォルダ選択フック（useEffectより先に定義してTDZを回避）
  const {
    folderPath,
    files: mediaFiles,
    totalCount: mediaFileCount,
    isLoading: isLoadingFiles,
    error: fileError,
    selectFolder: handleSelectFolder,
    reset: resetFolder,
  } = useFolderSelection({
    extensions: currentExtensions,
  });

  // ダイアログを開くたびに初期値へリセット（前回の状態が残らないようにする）
  useEffect(() => {
    if (isOpen) {
      setInputMode('clipDuration');
      setInputValues({
        clipCount: 15,
        clipDuration: 60,
        totalDuration: 3,
      });
      setSelectionMode('shuffle');
      setMediaType('video_only');
      setIncludeGif(false);
      setStartPosition('current');
      setCustomStartFrame(0);
      setPlacementMode('continuous');
      setGapFrames(0);
      setErrorMessage('');
      setPositionX(0);
      setPositionY(0);
      setScale(100);
      setAspectRatioPreset('16:9');
      setCustomAspectWidth(16);
      setCustomAspectHeight(9);
      const firstVideoLayer = layerOptions[0]?.value || 'V1';
      setTargetLayer(firstVideoLayer);
      // フォルダパスをリセット
      resetFolder();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // クリップ計算フック使用
  const calculated = useClipCalculation({
    inputMode,
    clipCount: inputValues.clipCount,
    clipDuration: inputValues.clipDuration,
    totalDuration: inputValues.totalDuration,
    fps,
  });

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
    const totalFrames = calculated.clipCount * calculated.clipDurationFrames + (calculated.clipCount - 1) * gap;
    const endFrame = start + totalFrames;
    return {
      startFrame: start,
      endFrame: endFrame,
      totalFrames: totalFrames,
      totalSeconds: (totalFrames / fps).toFixed(2),
    };
  }, [calculateStartFrame, calculated, placementMode, gapFrames, fps]);

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

  // バリデーション: 画像の最小フレーム数チェック
  const MIN_IMAGE_FRAMES = 6; // 0.2秒 @ 30fps
  const validationWarning = useMemo(() => {
    if (mediaType !== 'video_only' && calculated.clipDurationFrames < MIN_IMAGE_FRAMES) {
      return `画像の場合、最低${MIN_IMAGE_FRAMES}フレーム（約${(MIN_IMAGE_FRAMES / fps).toFixed(2)}秒）を推奨します`;
    }
    return null;
  }, [mediaType, calculated.clipDurationFrames, fps]);

  // バリデーション関数
  const validateInputs = useCallback(() => {
    // フォルダ選択チェック
    if (!folderPath) {
      return '素材フォルダを選択してください';
    }

    // 入力モードに応じた必須フィールドチェック
    if (inputMode === 'clipDuration') {
      if (!inputValues.clipCount || inputValues.clipCount === '' || inputValues.clipCount <= 0) {
        return 'クリップ数を入力してください';
      }
      if (!inputValues.clipDuration || inputValues.clipDuration === '' || inputValues.clipDuration <= 0) {
        return '各クリップのフレーム数を入力してください';
      }
    } else if (inputMode === 'divideDuration') {
      if (!inputValues.totalDuration || inputValues.totalDuration === '' || inputValues.totalDuration <= 0) {
        return '合計時間を入力してください';
      }
      if (!inputValues.clipCount || inputValues.clipCount === '' || inputValues.clipCount <= 0) {
        return 'クリップ数を入力してください';
      }
    } else if (inputMode === 'fillDuration') {
      if (!inputValues.totalDuration || inputValues.totalDuration === '' || inputValues.totalDuration <= 0) {
        return '合計時間を入力してください';
      }
      if (!inputValues.clipDuration || inputValues.clipDuration === '' || inputValues.clipDuration <= 0) {
        return '各クリップのフレーム数を入力してください';
      }
    }

    return null; // バリデーション成功
  }, [folderPath, inputMode, inputValues]);

  // 一括配置実行
  const handleBulkPlace = useCallback(() => {
    // バリデーション
    const error = validateInputs();
    if (error) {
      setErrorMessage(error);
      return;
    }

    // エラーをクリア
    setErrorMessage('');

    // 履歴に保存
    dispatch(saveToHistory());

    let currentFramePos = calculateStartFrame();
    const gap = placementMode === 'continuous' ? 0 : gapFrames;

    // クリップ名を素材タイプに応じて変更
    const clipNamePrefix = mediaType === 'video_only' ? 'ランダムビデオ' :
                          mediaType === 'image_only' ? 'ランダム画像' : 'ランダムメディア';

    for (let i = 0; i < calculated.clipCount; i++) {
      const clipData = {
        id: generateId(),
        type: 'random_layer',
        name: `${clipNamePrefix} ${i + 1}`,
        startFrame: currentFramePos,
        durationFrames: calculated.clipDurationFrames,
        opacity: 100,
        // 位置・スケール（scaleはパーセント値のまま保存、レンダラーが100で割る）
        positionX: positionX,
        positionY: positionY,
        scale: scale,
        folderPath: folderPath,
        selectionMode: selectionMode,
        // 素材タイプ関連（新規）
        mediaType: mediaType,
        includeGif: includeGif,
        extensions: currentExtensions.join(','),
        fileLimit: 0,
        randomSeed: Math.random(),
        // プレビュー色（パレットから順番に割り当て）
        previewColor: PREVIEW_COLORS[i % PREVIEW_COLORS.length],
      };

      dispatch(addClip({ layerId: targetLayer, clip: clipData, skipOverlapCheck: true }));

      currentFramePos += calculated.clipDurationFrames + gap;
    }

    onClose();
  }, [dispatch, calculateStartFrame, calculated, placementMode, gapFrames, targetLayer, folderPath, selectionMode, mediaType, includeGif, currentExtensions, positionX, positionY, scale, onClose, validateInputs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[520px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">ランダムメディア一括配置</h2>
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
          {/* 素材タイプ */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-secondary">素材タイプ</label>
            <div className="flex gap-3">
              {[
                { value: 'video_only', label: '動画のみ' },
                { value: 'image_only', label: '画像のみ' },
                { value: 'both', label: '両方' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value={opt.value}
                    checked={mediaType === opt.value}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="accent-accent-blue"
                  />
                  <span className="text-sm text-ink-primary">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* GIF含めるチェック（画像選択時のみ） */}
            {(mediaType === 'image_only' || mediaType === 'both') && (
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={includeGif}
                  onChange={(e) => setIncludeGif(e.target.checked)}
                  className="accent-accent-blue"
                />
                <span className="text-xs text-ink-muted">GIFを含める（重い場合あり）</span>
              </label>
            )}
          </div>

          {/* 素材フォルダ（新コンポーネント使用） */}
          <FolderSelector
            folderPath={folderPath}
            onSelect={handleSelectFolder}
            isLoading={isLoadingFiles}
            error={fileError}
            files={mediaFiles}
            totalCount={mediaFileCount}
            label="素材フォルダ"
            placeholder="/path/to/media"
            previewLimit={10}
          />

          {/* 選択モード（新モジュール使用） */}
          <SelectionModeSelect
            value={selectionMode}
            onChange={setSelectionMode}
          />

          {/* 入力モードセレクター（新モジュール使用） */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">配置パターン</label>
            <InputModeSelector
              mode={inputMode}
              onModeChange={setInputMode}
              values={inputValues}
              onValuesChange={setInputValues}
              calculated={calculated}
              fps={fps}
            />
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

          {/* 配置シミュレーション */}
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
                    <div>総クリップ数: {calculated.clipCount}</div>
                    <div>総時間: {previewInfo.totalSeconds}秒</div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-ink-muted mt-2">
                ※ X/Y: 0が中央。正の値で右/下、負の値で左/上に移動
              </p>
              {/* バリデーション警告 */}
              {validationWarning && (
                <div className="mt-2 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                  {validationWarning}
                </div>
              )}
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
