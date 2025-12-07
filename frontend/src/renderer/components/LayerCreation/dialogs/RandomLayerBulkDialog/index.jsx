import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers } from '../../../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../../../ui';
import { X } from '../../../Icons';
import InputModeSelector from './InputModeSelector';
import SelectionModeSelect from './SelectionModeHelp';
import { useClipCalculation } from '../../../../hooks/useClipCalculation';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const RandomLayerBulkDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);
  const fps = useSelector((state) => state.timeline.fps);

  // 入力モード
  const [inputMode, setInputMode] = useState('clipDuration');
  const [inputValues, setInputValues] = useState({
    clipCount: 15,
    clipDuration: 60, // フレーム
    totalDuration: 3, // 秒
  });

  // 選択モード
  const [selectionMode, setSelectionMode] = useState('random');

  // 配置設定
  const [targetLayer, setTargetLayer] = useState('V1');
  const [startPosition, setStartPosition] = useState('current');
  const [customStartFrame, setCustomStartFrame] = useState(0);
  const [placementMode, setPlacementMode] = useState('continuous');
  const [gapFrames, setGapFrames] = useState(0);
  const [folderPath, setFolderPath] = useState('');

  // クリップ計算フック使用
  const calculated = useClipCalculation({
    inputMode,
    clipCount: inputValues.clipCount,
    clipDuration: inputValues.clipDuration,
    totalDuration: inputValues.totalDuration,
    fps,
  });

  // ビデオレイヤーのみ抽出
  const layerOptions = useMemo(() =>
    layerOrder
      .filter(id => id.startsWith('V'))
      .map(layerId => ({
        value: layerId,
        label: layers[layerId]?.name || layerId
      })),
    [layerOrder, layers]
  );

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

  // 一括配置実行
  const handleBulkPlace = useCallback(() => {
    let currentFramePos = calculateStartFrame();
    const gap = placementMode === 'continuous' ? 0 : gapFrames;

    for (let i = 0; i < calculated.clipCount; i++) {
      const clipData = {
        id: generateId(),
        type: 'random_layer',
        name: `ランダムビデオ ${i + 1}`,
        startFrame: currentFramePos,
        durationFrames: calculated.clipDurationFrames,
        opacity: 100,
        folderPath: folderPath,
        selectionMode: selectionMode,
        extensions: '.mp4,.mov,.avi',
        fileLimit: 0,
        randomSeed: Math.random(),
      };

      dispatch(addClip({ layerId: targetLayer, clip: clipData }));

      currentFramePos += calculated.clipDurationFrames + gap;
    }

    onClose();
  }, [dispatch, calculateStartFrame, calculated, placementMode, gapFrames, targetLayer, folderPath, selectionMode, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[520px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">ランダムビデオ一括配置</h2>
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

          {/* プレビュー情報 */}
          <div className="p-3 bg-surface-sunken rounded border border-line">
            <h3 className="text-sm font-medium text-ink-secondary mb-2">配置プレビュー</h3>
            <div className="text-xs text-ink-muted space-y-1">
              <div>総クリップ数: {calculated.clipCount}</div>
              <div>各クリップ: {calculated.clipDurationFrames}フレーム ({calculated.clipDurationSeconds.toFixed(2)}秒)</div>
              <div>配置範囲: {previewInfo.startFrame}〜{previewInfo.endFrame}フレーム</div>
              <div>総時間: {previewInfo.totalSeconds}秒</div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-line">
          <Button variant="subtle" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleBulkPlace}>
            配置実行
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RandomLayerBulkDialog;
