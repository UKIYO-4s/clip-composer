import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateClip, saveToHistory } from '../../store/timelineSlice';
import { openRandomLayerPanel, selectRandomLayerById, selectAllRandomLayers } from '../../store/randomLayerSlice';
import { ChevronDown, Settings } from '../Icons';
import { Input, Button } from '../ui';
import EffectSection from './EffectSection';
import FontSelector from '../FontSelector/FontSelector';

// アコーディオンセクションコンポーネント
const Section = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-state-hover transition-colors"
      >
        <span className="text-sm font-semibold text-ink-secondary">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-ink-muted transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
};

// フォームフィールドコンポーネント
const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-ink-muted block">{label}</label>
    {children}
  </div>
);

// テキスト入力
const TextInput = ({ value, onChange, ...props }) => (
  <Input
    type="text"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    {...props}
  />
);

// 数値入力（バリデーション付き）
const NumberInput = ({ value, onChange, min, max, step = 1, ...props }) => {
  const [localValue, setLocalValue] = useState(String(value ?? 0));
  const [error, setError] = useState(null);
  const lastValidValue = React.useRef(value ?? 0);

  // 外部からの値変更を反映
  useEffect(() => {
    if (!isNaN(value) && value !== null && value !== undefined) {
      setLocalValue(String(value));
      lastValidValue.current = value;
      setError(null);
    }
  }, [value]);

  const validateAndCommit = (inputValue) => {
    const parsed = parseFloat(inputValue);

    // NaN または空文字列の場合
    if (isNaN(parsed) || inputValue.trim() === '') {
      setError('無効な数値です');
      setLocalValue(String(lastValidValue.current));
      return;
    }

    // 範囲外の場合はクランプ
    let clamped = parsed;
    if (min !== undefined && parsed < min) {
      clamped = min;
    }
    if (max !== undefined && parsed > max) {
      clamped = max;
    }

    setError(null);
    setLocalValue(String(clamped));
    lastValidValue.current = clamped;
    onChange(clamped);
  };

  const handleBlur = () => {
    validateAndCommit(localValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      validateAndCommit(localValue);
      e.target.blur();
    }
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        setError(null); // 入力中はエラーをクリア
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      error={error}
      {...props}
    />
  );
};

// スライダー（バリデーション付き）
const Slider = ({ value, onChange, min, max, step = 1, suffix = '' }) => {
  const [localValue, setLocalValue] = useState(String(value ?? min));
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const lastValidValue = React.useRef(value ?? min);

  // 外部からの値変更を反映（編集中でない場合のみ）
  useEffect(() => {
    if (!isEditing && !isNaN(value) && value !== null && value !== undefined) {
      setLocalValue(String(value));
      lastValidValue.current = value;
      setError(null);
    }
  }, [value, isEditing]);

  const validateAndCommit = (inputValue) => {
    const parsed = parseFloat(inputValue);

    // NaN または空文字列の場合
    if (isNaN(parsed) || inputValue.trim() === '') {
      setError('無効な数値です');
      setLocalValue(String(lastValidValue.current));
      return;
    }

    // 範囲外の場合はクランプ
    let clamped = parsed;
    if (min !== undefined && parsed < min) {
      clamped = min;
    }
    if (max !== undefined && parsed > max) {
      clamped = max;
    }

    setError(null);
    setLocalValue(String(clamped));
    lastValidValue.current = clamped;
    onChange(clamped);
  };

  const handleSliderChange = (e) => {
    const parsed = parseFloat(e.target.value);
    setLocalValue(String(parsed));
    lastValidValue.current = parsed;
    setError(null);
    onChange(parsed);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    validateAndCommit(localValue);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      validateAndCommit(localValue);
      e.target.blur();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={parseFloat(localValue) || min}
        onChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="flex-1 accent-accent-blue"
      />
      <input
        type="number"
        value={localValue}
        onChange={(e) => {
          setIsEditing(true);
          setLocalValue(e.target.value);
          setError(null);
        }}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        min={min}
        max={max}
        step={step}
        className={`w-14 text-xs text-right px-1 py-0.5 bg-surface-sunken border rounded focus:outline-none focus:border-accent-blue ${
          error ? 'border-accent-red text-accent-red' : 'border-line'
        }`}
        title={error || undefined}
      />
      <span className="text-xs text-ink-muted w-4">{suffix}</span>
    </div>
  );
};

// 一括適用用の数値入力（バリデーション付き）
const BulkNumberInput = ({ value, onChange, min, max, step = 1, disabled, className = '', ...props }) => {
  const [localValue, setLocalValue] = useState(String(value ?? 0));
  const [error, setError] = useState(null);
  const lastValidValue = React.useRef(value ?? 0);

  // 外部からの値変更を反映
  useEffect(() => {
    if (!isNaN(value) && value !== null && value !== undefined) {
      setLocalValue(String(value));
      lastValidValue.current = value;
      setError(null);
    }
  }, [value]);

  const validateAndCommit = (inputValue) => {
    const parsed = parseFloat(inputValue);

    // NaN または空文字列の場合
    if (isNaN(parsed) || inputValue.trim() === '') {
      setError('無効な数値です');
      setLocalValue(String(lastValidValue.current));
      // 一括適用の場合、無効値は保存しない（前の有効値を維持）
      return;
    }

    // 範囲外の場合はクランプ
    let clamped = parsed;
    if (min !== undefined && parsed < min) {
      clamped = min;
    }
    if (max !== undefined && parsed > max) {
      clamped = max;
    }

    setError(null);
    setLocalValue(String(clamped));
    lastValidValue.current = clamped;
    onChange(clamped);
  };

  const handleBlur = () => {
    validateAndCommit(localValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      validateAndCommit(localValue);
      e.target.blur();
    }
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        setError(null);
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      error={error}
      className={className}
      {...props}
    />
  );
};

// カラーピッカー
const ColorPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value || '#ffffff'}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
    />
    <Input
      type="text"
      value={value || '#ffffff'}
      onChange={(e) => onChange(e.target.value)}
      placeholder="#ffffff"
      className="flex-1"
    />
  </div>
);

// テキストエリア
const TextArea = ({ value, onChange, rows = 3, ...props }) => (
  <textarea
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    className="w-full px-2 py-1 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary resize-none"
    {...props}
  />
);

const PropertyPanel = () => {
  const dispatch = useDispatch();
  const { selectedClipIds, layers } = useSelector((state) => state.timeline);
  const selectedClipId = selectedClipIds?.[0]; // 後方互換

  // 選択されたクリップとそのレイヤーを見つける
  const selectedClipInfo = React.useMemo(() => {
    if (!selectedClipId) return null;

    for (const [layerId, layer] of Object.entries(layers)) {
      const clip = layer.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        return { clip, layerId };
      }
    }
    return null;
  }, [selectedClipId, layers]);

  // 一括適用用のstate
  const [bulkProperties, setBulkProperties] = useState({
    positionX: { enabled: false, value: 0 },
    positionY: { enabled: false, value: 0 },
    scale: { enabled: false, value: 100 },
    fit: { enabled: false, value: 'contain' },
    transition_in: {
      enabled: false,
      type: 'fade',
      duration_frames: 6,
      easing: 'ease_in_out',
    },
    previewColor: { enabled: false, value: '#ff0000' },
  });

  // 複数選択時の一括適用処理
  const handleBulkApply = () => {
    const updates = {};

    // 有効なプロパティのみを抽出
    Object.entries(bulkProperties).forEach(([key, propData]) => {
      if (key === 'transition_in') {
        // transition_inはオブジェクト形式で構築
        if (propData.enabled) {
          if (propData.type === 'none') {
            updates[key] = null; // なしの場合はnull
          } else {
            updates[key] = {
              type: propData.type,
              duration_frames: propData.duration_frames,
              easing: propData.easing,
            };
          }
        }
      } else if (propData.enabled) {
        updates[key] = propData.value;
      }
    });

    // 何も選択されていない場合は何もしない
    if (Object.keys(updates).length === 0) {
      return;
    }

    // 履歴に保存
    dispatch(saveToHistory());

    // 各選択クリップに対して適用
    selectedClipIds.forEach((clipId) => {
      // クリップが属するレイヤーを検索
      for (const [layerId, layer] of Object.entries(layers)) {
        const clip = layer.clips.find((c) => c.id === clipId);
        if (clip) {
          dispatch(updateClip({ layerId, clipId, updates }));
          break;
        }
      }
    });
  };

  // 複数選択時の表示
  if (selectedClipIds?.length > 1) {
    return (
      <div className="h-full bg-surface-raised overflow-y-auto">
        <div className="p-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink-secondary">プロパティ</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-sm text-ink-secondary font-semibold">
            {selectedClipIds.length}個のクリップを選択中
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-sm font-semibold text-ink-secondary mb-3">一括適用</div>

            <div className="space-y-3">
              {/* 位置X */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkProperties.positionX.enabled}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      positionX: { ...prev.positionX, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-accent-blue"
                />
                <label className="text-xs text-ink-muted w-20">位置 X</label>
                <BulkNumberInput
                  value={bulkProperties.positionX.value}
                  onChange={(value) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      positionX: { ...prev.positionX, value },
                    }))
                  }
                  disabled={!bulkProperties.positionX.enabled}
                  className="flex-1"
                  step={1}
                />
              </div>

              {/* 位置Y */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkProperties.positionY.enabled}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      positionY: { ...prev.positionY, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-accent-blue"
                />
                <label className="text-xs text-ink-muted w-20">位置 Y</label>
                <BulkNumberInput
                  value={bulkProperties.positionY.value}
                  onChange={(value) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      positionY: { ...prev.positionY, value },
                    }))
                  }
                  disabled={!bulkProperties.positionY.enabled}
                  className="flex-1"
                  step={1}
                />
              </div>

              {/* スケール */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkProperties.scale.enabled}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      scale: { ...prev.scale, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-accent-blue"
                />
                <label className="text-xs text-ink-muted w-20">スケール</label>
                <BulkNumberInput
                  value={bulkProperties.scale.value}
                  onChange={(value) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      scale: { ...prev.scale, value },
                    }))
                  }
                  disabled={!bulkProperties.scale.enabled}
                  className="flex-1"
                  min={0}
                  max={400}
                  step={1}
                />
                <span className="text-xs text-ink-muted w-6">%</span>
              </div>

              {/* フィットモード */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkProperties.fit.enabled}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      fit: { ...prev.fit, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-accent-blue"
                />
                <label className="text-xs text-ink-muted w-20">フィットモード</label>
                <select
                  value={bulkProperties.fit.value}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      fit: { ...prev.fit, value: e.target.value },
                    }))
                  }
                  disabled={!bulkProperties.fit.enabled}
                  className="flex-1 px-2 py-1 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary disabled:opacity-50"
                >
                  <option value="contain">フィット（全体表示）</option>
                  <option value="cover">カバー（画面いっぱい）</option>
                  <option value="none">なし（元サイズ）</option>
                </select>
              </div>

              {/* トランジション */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bulkProperties.transition_in.enabled}
                    onChange={(e) =>
                      setBulkProperties((prev) => ({
                        ...prev,
                        transition_in: { ...prev.transition_in, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-accent-blue"
                  />
                  <label className="text-xs text-ink-muted w-20">トランジション</label>
                  <select
                    value={bulkProperties.transition_in.type}
                    onChange={(e) =>
                      setBulkProperties((prev) => ({
                        ...prev,
                        transition_in: { ...prev.transition_in, type: e.target.value },
                      }))
                    }
                    disabled={!bulkProperties.transition_in.enabled}
                    className="flex-1 px-2 py-1 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary disabled:opacity-50"
                  >
                    <option value="none">なし</option>
                    <option value="fade">フェード</option>
                    <option value="slide">スライド</option>
                    <option value="zoom">ズーム</option>
                  </select>
                </div>
                {bulkProperties.transition_in.enabled && bulkProperties.transition_in.type !== 'none' && (
                  <div className="ml-6 flex items-center gap-2">
                    <label className="text-xs text-ink-muted w-16">フレーム数</label>
                    <BulkNumberInput
                      value={bulkProperties.transition_in.duration_frames}
                      onChange={(value) =>
                        setBulkProperties((prev) => ({
                          ...prev,
                          transition_in: {
                            ...prev.transition_in,
                            duration_frames: value,
                          },
                        }))
                      }
                      min={1}
                      max={60}
                      className="w-16"
                    />
                    <label className="text-xs text-ink-muted w-16">イージング</label>
                    <select
                      value={bulkProperties.transition_in.easing}
                      onChange={(e) =>
                        setBulkProperties((prev) => ({
                          ...prev,
                          transition_in: { ...prev.transition_in, easing: e.target.value },
                        }))
                      }
                      className="flex-1 px-2 py-1 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
                    >
                      <option value="linear">リニア</option>
                      <option value="ease_in">イーズイン</option>
                      <option value="ease_out">イーズアウト</option>
                      <option value="ease_in_out">イーズインアウト</option>
                    </select>
                  </div>
                )}
              </div>

              {/* プレビュー色 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkProperties.previewColor.enabled}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      previewColor: { ...prev.previewColor, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-accent-blue"
                />
                <label className="text-xs text-ink-muted w-20">プレビュー色</label>
                <input
                  type="color"
                  value={bulkProperties.previewColor.value}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      previewColor: { ...prev.previewColor, value: e.target.value },
                    }))
                  }
                  disabled={!bulkProperties.previewColor.enabled}
                  className="w-12 h-8 bg-surface-sunken border border-line rounded cursor-pointer disabled:opacity-50"
                />
                <Input
                  type="text"
                  value={bulkProperties.previewColor.value}
                  onChange={(e) =>
                    setBulkProperties((prev) => ({
                      ...prev,
                      previewColor: { ...prev.previewColor, value: e.target.value },
                    }))
                  }
                  disabled={!bulkProperties.previewColor.enabled}
                  className="flex-1"
                  placeholder="#ff0000"
                />
              </div>
            </div>

            <button
              onClick={handleBulkApply}
              className="w-full mt-4 px-4 py-2 bg-accent-blue text-white text-sm font-semibold rounded hover:bg-accent-blue/90 transition-colors"
            >
              選択クリップに一括適用
            </button>
          </div>
        </div>
      </div>
    );
  }

  // クリップが選択されていない場合
  if (!selectedClipInfo) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-raised text-ink-muted text-sm">
        クリップを選択してください
      </div>
    );
  }

  const { clip, layerId } = selectedClipInfo;

  // プロパティ更新ハンドラー
  const handleUpdate = (updates) => {
    dispatch(saveToHistory());
    dispatch(updateClip({ layerId, clipId: clip.id, updates }));
  };

  return (
    <div className="h-full bg-surface-raised overflow-y-auto">
      <div className="p-4 border-b border-line">
        <h2 className="text-sm font-semibold text-ink-secondary">プロパティ</h2>
      </div>

      {/* 共通プロパティ */}
      <Section title="基本設定" defaultOpen={true}>
        <Field label="名前">
          <TextInput
            value={clip.name}
            onChange={(value) => handleUpdate({ name: value })}
          />
        </Field>
        <Field label="開始フレーム">
          <NumberInput
            value={clip.startFrame}
            onChange={(value) => handleUpdate({ startFrame: Math.max(0, value) })}
            min={0}
          />
        </Field>
        <Field label="長さ（フレーム）">
          <NumberInput
            value={clip.durationFrames}
            onChange={(value) => handleUpdate({ durationFrames: Math.max(1, value) })}
            min={1}
          />
        </Field>
        <Field label="不透明度">
          <Slider
            value={clip.opacity ?? 100}
            onChange={(value) => handleUpdate({ opacity: value })}
            min={0}
            max={100}
            step={1}
            suffix="%"
          />
        </Field>
      </Section>

      {/* ビデオ/画像/ランダムレイヤー プロパティ */}
      {(clip.type === 'video' || clip.type === 'image' || clip.type === 'random_layer') && (
        <Section title="トランスフォーム" defaultOpen={true}>
          <Field label="フィットモード">
            <select
              value={clip.fit ?? 'contain'}
              onChange={(e) => handleUpdate({ fit: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            >
              <option value="contain">フィット（余白あり）</option>
              <option value="cover">カバー（はみ出し）</option>
              <option value="none">なし（元サイズ）</option>
            </select>
          </Field>
          <Field label="スケール">
            <Slider
              value={clip.scale ?? 100}
              onChange={(value) => handleUpdate({ scale: value })}
              min={0}
              max={400}
              step={1}
              suffix="%"
            />
          </Field>
          <Field label="位置 X">
            <NumberInput
              value={clip.positionX ?? 0}
              onChange={(value) => handleUpdate({ positionX: value })}
              step={1}
            />
          </Field>
          <Field label="位置 Y">
            <NumberInput
              value={clip.positionY ?? 0}
              onChange={(value) => handleUpdate({ positionY: value })}
              step={1}
            />
          </Field>
          <Field label="回転">
            <Slider
              value={clip.rotation ?? 0}
              onChange={(value) => handleUpdate({ rotation: value })}
              min={-180}
              max={180}
              step={1}
              suffix="°"
            />
          </Field>
        </Section>
      )}

      {/* プレビューオーバーレイ設定（random_layer用） */}
      {clip.type === 'random_layer' && (
        <Section title="プレビュー表示" defaultOpen={true}>
          <Field label="オーバーレイ色">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={clip.previewColor || '#22C55E'}
                onChange={(e) => handleUpdate({ previewColor: e.target.value })}
                className="w-10 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
              />
              <Input
                type="text"
                value={clip.previewColor || '#22C55E'}
                onChange={(e) => handleUpdate({ previewColor: e.target.value })}
                placeholder="#22C55E"
                className="flex-1"
              />
              <button
                onClick={() => handleUpdate({ previewColor: null })}
                className="px-2 py-1 text-xs bg-surface-sunken border border-line rounded hover:bg-surface-hover text-ink-muted"
                title="色をクリア"
              >
                ✕
              </button>
            </div>
          </Field>
          <p className="text-xs text-ink-muted mt-1">
            プレビューに色付き矩形を表示します（エクスポートには含まれません）
          </p>
        </Section>
      )}

      {/* ランダムレイヤー管理（random_layer用） */}
      {clip.type === 'random_layer' && (
        <Section title="ランダムレイヤー" defaultOpen={true}>
          <div className="space-y-2">
            <Field label="フォルダパス">
              <p className="text-xs text-ink-secondary truncate" title={clip.folderPath}>
                {clip.folderPath || '(未設定)'}
              </p>
            </Field>
            {clip.randomLayerId && (
              <p className="text-xs text-ink-muted">
                共有ID: {clip.randomLayerId.slice(-8)}
              </p>
            )}
            <Button
              variant="subtle"
              size="sm"
              onClick={() => dispatch(openRandomLayerPanel())}
              className="w-full flex items-center justify-center gap-1"
            >
              <Settings className="w-3 h-3" />
              ランダムレイヤー管理
            </Button>
          </div>
        </Section>
      )}

      {/* エフェクト設定（video/image/random_layer用） */}
      {(clip.type === 'video' || clip.type === 'image' || clip.type === 'random_layer') && (
        <Section title="エフェクト" defaultOpen={false}>
          <EffectSection
            effects={clip.effects || []}
            onUpdate={(effects) => handleUpdate({ effects })}
          />
        </Section>
      )}

      {/* テキストプロパティ */}
      {(clip.type === 'text' || clip.type === 'variable_text' || clip.type === 'csv_text_placeholder') && (
        <Section title="テキスト設定" defaultOpen={true}>
          {clip.type === 'text' && (
            <Field label="テキスト内容">
              <TextArea
                value={clip.textContent}
                onChange={(value) => handleUpdate({ textContent: value })}
                rows={4}
              />
            </Field>
          )}
          <Field label="フォント">
            <FontSelector
              value={clip.fontFamily || 'Hiragino Sans'}
              onChange={(value) => handleUpdate({ fontFamily: value })}
              previewText={clip.textContent || clip.template || 'サンプル'}
            />
          </Field>
          <Field label="フォントサイズ">
            <NumberInput
              value={clip.fontSize ?? 24}
              onChange={(value) => handleUpdate({ fontSize: Math.max(1, value) })}
              min={1}
              max={200}
            />
          </Field>
          <Field label="文字色">
            <ColorPicker
              value={clip.textColor}
              onChange={(value) => handleUpdate({ textColor: value })}
            />
          </Field>
          <Field label="背景色">
            <ColorPicker
              value={clip.bgColor}
              onChange={(value) => handleUpdate({ bgColor: value })}
            />
          </Field>
        </Section>
      )}

      {/* オーディオプロパティ */}
      {(clip.type === 'bgm' || clip.type === 'se') && (
        <Section title="オーディオ設定" defaultOpen={true}>
          <Field label="ボリューム">
            <Slider
              value={clip.volume ?? 100}
              onChange={(value) => handleUpdate({ volume: value })}
              min={0}
              max={200}
              step={1}
              suffix="%"
            />
          </Field>
          <Field label="フェードイン（秒）">
            <NumberInput
              value={clip.fadeIn ?? 0}
              onChange={(value) => handleUpdate({ fadeIn: Math.max(0, value) })}
              min={0}
              step={0.1}
            />
          </Field>
          <Field label="フェードアウト（秒）">
            <NumberInput
              value={clip.fadeOut ?? 0}
              onChange={(value) => handleUpdate({ fadeOut: Math.max(0, value) })}
              min={0}
              step={0.1}
            />
          </Field>
        </Section>
      )}

      {/* クリップタイプ情報 */}
      <Section title="情報" defaultOpen={false}>
        <div className="text-xs text-ink-muted space-y-1">
          <div>タイプ: {clip.type}</div>
          <div>ID: {clip.id}</div>
          <div>レイヤー: {layerId}</div>
        </div>
      </Section>
    </div>
  );
};

export default PropertyPanel;
