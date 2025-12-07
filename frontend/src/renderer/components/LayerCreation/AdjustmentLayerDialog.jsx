import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// プリセット定義
const presets = [
  { id: 'default', name: 'デフォルト', settings: { brightness: 100, contrast: 100, saturation: 100, blur: 0, temperature: 0, vignette: 0 } },
  { id: 'warm', name: '暖色系', settings: { brightness: 105, contrast: 105, saturation: 110, blur: 0, temperature: 30, vignette: 10 } },
  { id: 'cool', name: '寒色系', settings: { brightness: 100, contrast: 110, saturation: 90, blur: 0, temperature: -30, vignette: 10 } },
  { id: 'vintage', name: 'ビンテージ', settings: { brightness: 95, contrast: 120, saturation: 70, blur: 0, temperature: 20, vignette: 30 } },
  { id: 'dramatic', name: 'ドラマチック', settings: { brightness: 90, contrast: 140, saturation: 120, blur: 0, temperature: 0, vignette: 20 } },
  { id: 'blur', name: 'ぼかし', settings: { brightness: 100, contrast: 100, saturation: 100, blur: 5, temperature: 0, vignette: 0 } },
];

const AdjustmentLayerDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);

  // 設定状態
  const [targetLayer, setTargetLayer] = useState('V1');
  const [clipDuration, setClipDuration] = useState(150); // フレーム
  const [startFrame, setStartFrame] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('default');

  // エフェクト設定
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [vignette, setVignette] = useState(0);

  // プリセット適用
  const applyPreset = useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setBrightness(preset.settings.brightness);
      setContrast(preset.settings.contrast);
      setSaturation(preset.settings.saturation);
      setBlur(preset.settings.blur);
      setTemperature(preset.settings.temperature);
      setVignette(preset.settings.vignette);
    }
  }, []);

  // 現在位置を使用
  const handleUseCurrentPosition = () => {
    setStartFrame(currentFrame);
  };

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

  // 作成実行
  const handleCreate = useCallback(() => {
    const clipData = {
      id: generateId(),
      type: 'adjustment',
      name: `調整: ${presets.find(p => p.id === selectedPreset)?.name || 'カスタム'}`,
      startFrame: startFrame,
      durationFrames: clipDuration,
      opacity: 100,
      // 調整レイヤー固有プロパティ
      brightness,
      contrast,
      saturation,
      blur,
      temperature,
      vignette,
    };

    dispatch(addClip({ layerId: targetLayer, clip: clipData }));
    onClose();
  }, [dispatch, targetLayer, startFrame, clipDuration, selectedPreset, brightness, contrast, saturation, blur, temperature, vignette, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[480px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">調整レイヤー作成</h2>
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
          {/* プリセット選択 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-secondary">プリセット</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    selectedPreset === preset.id
                      ? 'bg-accent-blue text-white border-accent-blue'
                      : 'bg-surface-sunken text-ink-primary border-line hover:bg-state-hover'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* エフェクト調整 */}
          <div className="space-y-3 p-3 bg-surface-sunken rounded border border-line">
            <h4 className="text-xs font-medium text-ink-secondary">エフェクト調整</h4>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">明るさ</label>
                <input
                  type="range"
                  value={brightness}
                  onChange={(e) => { setBrightness(parseInt(e.target.value)); setSelectedPreset(''); }}
                  min={0}
                  max={200}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{brightness}%</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">コントラスト</label>
                <input
                  type="range"
                  value={contrast}
                  onChange={(e) => { setContrast(parseInt(e.target.value)); setSelectedPreset(''); }}
                  min={0}
                  max={200}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{contrast}%</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">彩度</label>
                <input
                  type="range"
                  value={saturation}
                  onChange={(e) => { setSaturation(parseInt(e.target.value)); setSelectedPreset(''); }}
                  min={0}
                  max={200}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{saturation}%</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">ブラー</label>
                <input
                  type="range"
                  value={blur}
                  onChange={(e) => { setBlur(parseFloat(e.target.value)); setSelectedPreset(''); }}
                  min={0}
                  max={20}
                  step={0.5}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{blur}px</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">色温度</label>
                <input
                  type="range"
                  value={temperature}
                  onChange={(e) => { setTemperature(parseInt(e.target.value)); setSelectedPreset(''); }}
                  min={-100}
                  max={100}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{temperature}</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted w-16">ビネット</label>
                <input
                  type="range"
                  value={vignette}
                  onChange={(e) => { setVignette(parseInt(e.target.value)); setSelectedPreset(''); }}
                  min={0}
                  max={100}
                  className="flex-1 accent-accent-blue"
                />
                <span className="text-xs text-ink-muted w-12 text-right">{vignette}%</span>
              </div>
            </div>
          </div>

          {/* 配置設定 */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="配置先レイヤー"
              value={targetLayer}
              onChange={(e) => setTargetLayer(e.target.value)}
              options={layerOptions}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">クリップの長さ（フレーム）</label>
              <Input
                type="number"
                value={clipDuration}
                onChange={(e) => setClipDuration(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
              <span className="text-xs text-ink-muted">
                {(clipDuration / 30).toFixed(2)}秒 @ 30fps
              </span>
            </div>
          </div>

          {/* 開始位置 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">開始フレーム</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={startFrame}
                onChange={(e) => setStartFrame(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="flex-1"
              />
              <Button variant="subtle" size="sm" onClick={handleUseCurrentPosition}>
                現在位置
              </Button>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-line">
          <Button variant="subtle" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            作成
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentLayerDialog;
