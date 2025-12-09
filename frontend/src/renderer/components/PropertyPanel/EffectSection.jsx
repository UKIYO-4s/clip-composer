import React, { useState } from 'react';
import { ChevronDown, X, Plus } from '../Icons';
import { Input } from '../ui';
import Button from '../ui/Button';

// エフェクトタイプの定義
const EFFECT_TYPES = [
  { value: 'slide', label: 'スライド' },
  { value: 'zoom', label: 'ズーム' },
  { value: 'blur', label: 'ブラー' },
  { value: 'rotate', label: '回転' },
];

// タイプ別デフォルトパラメータ
const DEFAULT_PARAMS = {
  slide: {
    direction: 'top',
    easing: 'ease-out',
    distance: null,
  },
  zoom: {
    start_scale: 1.0,
    end_scale: 1.2,
    center_x: 0.5,
    center_y: 0.5,
    easing: 'ease-out',
  },
  blur: {
    amount: 5,
    easing: 'ease-out',
  },
  rotate: {
    start_angle: 0,
    end_angle: 360,
    easing: 'linear',
  },
};

// タイミング位置の定義
const TIMING_POSITIONS = [
  { value: 'in', label: 'イン' },
  { value: 'out', label: 'アウト' },
  { value: 'full', label: '全体' },
];

// スライド方向の定義
const SLIDE_DIRECTIONS = [
  { value: 'top', label: '上から' },
  { value: 'bottom', label: '下から' },
  { value: 'left', label: '左から' },
  { value: 'right', label: '右から' },
];

// イージングの定義（簡易SVGカーブ付き）
const EASING_OPTIONS = [
  { value: 'linear', label: 'リニア（直線）', path: 'M 0 20 L 20 0' },
  { value: 'ease-in', label: 'イーズイン（加速）', path: 'M 0 20 Q 0 20 20 0' },
  { value: 'ease-out', label: 'イーズアウト（減速）', path: 'M 0 20 Q 20 0 20 0' },
  { value: 'ease-in-out', label: 'イーズインアウト（加減速）', path: 'M 0 20 Q 0 15 10 10 Q 20 5 20 0' },
  { value: 'ease-out-back', label: 'バウンス戻り', path: 'M 0 20 Q 10 0 15 5 Q 20 0 20 0' },
  { value: 'ease-out-elastic', label: '弾性', path: 'M 0 20 Q 5 0 10 8 Q 15 2 20 0' },
];

// フィールドコンポーネント
const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-ink-muted block">{label}</label>
    {children}
  </div>
);

// 数値入力
const NumberInput = ({ value, onChange, min, max, step = 1, ...props }) => (
  <Input
    type="number"
    value={value ?? ''}
    onChange={(e) => {
      const val = e.target.value;
      if (val === '') {
        onChange(null);
        return;
      }
      const n = parseFloat(val);
      if (Number.isNaN(n)) return;
      onChange(n);
    }}
    min={min}
    max={max}
    step={step}
    {...props}
  />
);

// スライダー
const Slider = ({ value, onChange, min, max, step = 1, suffix = '' }) => (
  <div className="flex items-center gap-2">
    <input
      type="range"
      value={value ?? min}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="flex-1 accent-accent-blue"
    />
    <span className="text-xs text-ink-muted w-16 text-right">
      {value ?? min}{suffix}
    </span>
  </div>
);

// セレクトコンポーネント（シンプル版）
const SimpleSelect = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full h-8 px-2.5 rounded bg-surface-sunken border border-line hover:border-line-bright text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-colors duration-150"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

// イージングセレクト（カーブサムネイル付き）
const EasingSelect = ({ value, onChange }) => (
  <div className="space-y-2">
    <SimpleSelect
      value={value}
      onChange={onChange}
      options={EASING_OPTIONS}
    />
    <div className="flex items-center justify-center p-2 bg-surface-sunken rounded">
      <svg width="80" height="40" viewBox="0 0 20 20" className="text-accent-blue">
        <path
          d={EASING_OPTIONS.find(e => e.value === value)?.path || 'M 0 20 L 20 0'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  </div>
);

// エフェクトサマリー生成
const getEffectSummary = (effect) => {
  const parts = [];

  if (effect.timing) {
    const pos = TIMING_POSITIONS.find(p => p.value === effect.timing.position);
    if (pos) parts.push(pos.label);
    if (effect.timing.duration_frames) parts.push(`${effect.timing.duration_frames}f`);
  }

  if (effect.params) {
    switch (effect.type) {
      case 'slide':
        const dir = SLIDE_DIRECTIONS.find(d => d.value === effect.params.direction);
        if (dir) parts.push(dir.label);
        break;
      case 'zoom':
        if (effect.params.start_scale !== undefined && effect.params.end_scale !== undefined) {
          parts.push(`${effect.params.start_scale}x → ${effect.params.end_scale}x`);
        }
        break;
      case 'blur':
        if (effect.params.amount !== undefined) {
          parts.push(`${effect.params.amount}px`);
        }
        break;
      case 'rotate':
        if (effect.params.start_angle !== undefined && effect.params.end_angle !== undefined) {
          parts.push(`${effect.params.start_angle}° → ${effect.params.end_angle}°`);
        }
        break;
    }
  }

  return parts.join(' ');
};

// エフェクトアイテムコンポーネント
const EffectItem = ({ effect, onUpdate, onDelete, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const effectType = EFFECT_TYPES.find(t => t.value === effect.type);
  const summary = getEffectSummary(effect);

  const updateEffect = (updates) => {
    onUpdate({ ...effect, ...updates });
  };

  const updateTiming = (updates) => {
    onUpdate({
      ...effect,
      timing: { ...effect.timing, ...updates }
    });
  };

  const updateParams = (updates) => {
    onUpdate({
      ...effect,
      params: { ...effect.params, ...updates }
    });
  };

  const handleTypeChange = (newType) => {
    onUpdate({
      ...effect,
      type: newType,
      params: DEFAULT_PARAMS[newType] || {},
    });
  };

  return (
    <div className="border border-line rounded bg-surface-sunken">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* 有効/無効トグル */}
        <input
          type="checkbox"
          checked={!!effect.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded accent-accent-blue cursor-pointer"
        />

        {/* タイトルとサマリー */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-2 text-left hover:text-accent-blue transition-colors"
        >
          <span className="text-sm font-medium text-ink-primary">
            {effectType?.label || effect.type}
          </span>
          {summary && (
            <span className="text-xs text-ink-muted">
              {summary}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-ink-muted transform transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* 削除ボタン */}
        <button
          onClick={onDelete}
          className="p-1 hover:bg-state-hover rounded transition-colors"
          title="削除"
        >
          <X className="w-4 h-4 text-ink-muted hover:text-accent-red" />
        </button>
      </div>

      {/* 詳細設定 */}
      {isExpanded && (
        <div className="px-3 py-3 space-y-3 border-t border-line">
          {/* エフェクトタイプ選択 */}
          <Field label="エフェクトタイプ">
            <SimpleSelect
              value={effect.type}
              onChange={handleTypeChange}
              options={EFFECT_TYPES}
            />
          </Field>

          {/* タイミング設定 */}
          <Field label="適用タイミング">
            <SimpleSelect
              value={effect.timing?.position ?? 'in'}
              onChange={(value) => updateTiming({ position: value })}
              options={TIMING_POSITIONS}
            />
          </Field>

          <Field label="長さ（フレーム）">
            <NumberInput
              value={effect.timing?.duration_frames ?? 20}
              onChange={(value) => updateTiming({ duration_frames: Math.max(1, value) })}
              min={1}
            />
          </Field>

          {/* パラメータ設定（タイプ別） */}
          {effect.type === 'slide' && (
            <>
              <Field label="方向">
                <SimpleSelect
                  value={effect.params?.direction ?? 'top'}
                  onChange={(value) => updateParams({ direction: value })}
                  options={SLIDE_DIRECTIONS}
                />
              </Field>

              <Field label="イージング">
                <EasingSelect
                  value={effect.params?.easing ?? 'ease-out'}
                  onChange={(value) => updateParams({ easing: value })}
                />
              </Field>

              <Field label="距離（px、空白で自動）">
                <NumberInput
                  value={effect.params?.distance ?? ''}
                  onChange={(value) => updateParams({ distance: value })}
                  min={0}
                  placeholder="自動"
                />
              </Field>
            </>
          )}

          {effect.type === 'zoom' && (
            <>
              <Field label="開始スケール">
                <Slider
                  value={effect.params?.start_scale ?? 1.0}
                  onChange={(value) => updateParams({ start_scale: value })}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  suffix="x"
                />
              </Field>

              <Field label="終了スケール">
                <Slider
                  value={effect.params?.end_scale ?? 1.2}
                  onChange={(value) => updateParams({ end_scale: value })}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  suffix="x"
                />
              </Field>

              <Field label="中心X（0-1）">
                <Slider
                  value={effect.params?.center_x ?? 0.5}
                  onChange={(value) => updateParams({ center_x: value })}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Field>

              <Field label="中心Y（0-1）">
                <Slider
                  value={effect.params?.center_y ?? 0.5}
                  onChange={(value) => updateParams({ center_y: value })}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Field>

              <Field label="イージング">
                <EasingSelect
                  value={effect.params?.easing ?? 'ease-out'}
                  onChange={(value) => updateParams({ easing: value })}
                />
              </Field>
            </>
          )}

          {effect.type === 'blur' && (
            <>
              <Field label="ブラー量">
                <Slider
                  value={effect.params?.amount ?? 5}
                  onChange={(value) => updateParams({ amount: value })}
                  min={0}
                  max={20}
                  step={1}
                  suffix="px"
                />
              </Field>

              <Field label="イージング">
                <EasingSelect
                  value={effect.params?.easing ?? 'ease-out'}
                  onChange={(value) => updateParams({ easing: value })}
                />
              </Field>
            </>
          )}

          {effect.type === 'rotate' && (
            <>
              <Field label="開始角度">
                <NumberInput
                  value={effect.params?.start_angle ?? 0}
                  onChange={(value) => updateParams({ start_angle: value })}
                  min={0}
                  max={360}
                />
              </Field>

              <Field label="終了角度">
                <NumberInput
                  value={effect.params?.end_angle ?? 360}
                  onChange={(value) => updateParams({ end_angle: value })}
                  min={0}
                  max={360}
                />
              </Field>

              <Field label="イージング">
                <EasingSelect
                  value={effect.params?.easing ?? 'linear'}
                  onChange={(value) => updateParams({ easing: value })}
                />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// エフェクトセクションコンポーネント
const EffectSection = ({ effects = [], onUpdate }) => {
  // エフェクトを追加
  const handleAddEffect = () => {
    const defaultType = 'slide';
    const newEffect = {
      id: `effect-${Date.now()}`,
      type: defaultType,
      enabled: true,
      order: effects.length * 10,
      timing: {
        position: 'in',
        duration_frames: 20,
      },
      params: DEFAULT_PARAMS[defaultType],
    };
    onUpdate([...effects, newEffect]);
  };

  // エフェクトを更新
  const handleUpdateEffect = (index, updatedEffect) => {
    const newEffects = [...effects];
    newEffects[index] = updatedEffect;
    onUpdate(newEffects);
  };

  // エフェクトを削除
  const handleDeleteEffect = (index) => {
    const newEffects = effects.filter((_, i) => i !== index);
    onUpdate(newEffects);
  };

  // エフェクトの有効/無効を切り替え
  const handleToggleEffect = (index, enabled) => {
    const newEffects = [...effects];
    newEffects[index] = { ...newEffects[index], enabled };
    onUpdate(newEffects);
  };

  return (
    <div className="space-y-2">
      {/* エフェクトリスト */}
      {effects.map((effect, index) => (
        <EffectItem
          key={effect.id}
          effect={effect}
          onUpdate={(updated) => handleUpdateEffect(index, updated)}
          onDelete={() => handleDeleteEffect(index)}
          onToggle={(enabled) => handleToggleEffect(index, enabled)}
        />
      ))}

      {/* 追加ボタン */}
      <Button
        variant="subtle"
        size="sm"
        onClick={handleAddEffect}
        className="w-full"
      >
        <Plus className="w-4 h-4" />
        エフェクト追加
      </Button>
    </div>
  );
};

export default EffectSection;
