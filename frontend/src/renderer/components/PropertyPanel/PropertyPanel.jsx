import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateClip } from '../../store/timelineSlice';
import { ChevronDown } from '../Icons';
import { Input } from '../ui';

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

// 数値入力
const NumberInput = ({ value, onChange, min, max, step = 1, ...props }) => (
  <Input
    type="number"
    value={value ?? 0}
    onChange={(e) => onChange(parseFloat(e.target.value))}
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
  const { selectedClipId, layers } = useSelector((state) => state.timeline);

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

      {/* ビデオ/画像プロパティ */}
      {(clip.type === 'video' || clip.type === 'image') && (
        <Section title="トランスフォーム" defaultOpen={true}>
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

      {/* テキストプロパティ */}
      {clip.type === 'text' && (
        <Section title="テキスト設定" defaultOpen={true}>
          <Field label="テキスト内容">
            <TextArea
              value={clip.textContent}
              onChange={(value) => handleUpdate({ textContent: value })}
              rows={4}
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
