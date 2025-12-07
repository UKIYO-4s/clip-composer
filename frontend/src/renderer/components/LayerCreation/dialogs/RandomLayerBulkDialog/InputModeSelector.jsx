import React from 'react';

const INPUT_MODES = [
  {
    id: 'clipDuration',
    label: 'クリップ長を指定',
    description: 'クリップ数と各クリップの長さを指定',
    fields: ['clipCount', 'clipDuration'],
  },
  {
    id: 'divideDuration',
    label: '合計時間を分割',
    description: '合計時間をクリップ数で均等分割',
    fields: ['totalDuration', 'clipCount'],
  },
  {
    id: 'fillDuration',
    label: '時間をクリップで埋める',
    description: '合計時間を指定クリップ長で埋める',
    fields: ['totalDuration', 'clipDuration'],
  },
];

const FieldRow = ({ label, value, onChange, suffix, step = 1 }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-ink-secondary w-20">{label}:</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      step={step}
      min={step}
      className="w-20 h-7 px-2 text-sm bg-surface-base border border-line rounded text-ink-primary"
    />
    <span className="text-xs text-ink-muted">{suffix}</span>
  </div>
);

export const InputModeSelector = ({
  mode,
  onModeChange,
  values,
  onValuesChange,
  calculated,
  fps = 30,
}) => {
  return (
    <div className="space-y-3">
      {INPUT_MODES.map((inputMode) => (
        <div key={inputMode.id} className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              value={inputMode.id}
              checked={mode === inputMode.id}
              onChange={(e) => onModeChange(e.target.value)}
              className="text-accent-blue"
            />
            <span className="text-sm text-ink-primary">{inputMode.label}</span>
          </label>

          {mode === inputMode.id && (
            <div className="ml-6 p-3 bg-surface-sunken rounded space-y-2">
              {inputMode.fields.includes('clipCount') && (
                <FieldRow
                  label="クリップ数"
                  value={values.clipCount}
                  onChange={(v) => onValuesChange({ ...values, clipCount: v })}
                  suffix="個"
                />
              )}
              {inputMode.fields.includes('clipDuration') && (
                <FieldRow
                  label="各クリップ"
                  value={values.clipDuration}
                  onChange={(v) => onValuesChange({ ...values, clipDuration: v })}
                  suffix="フレーム"
                />
              )}
              {inputMode.fields.includes('totalDuration') && (
                <FieldRow
                  label="合計時間"
                  value={values.totalDuration}
                  onChange={(v) => onValuesChange({ ...values, totalDuration: v })}
                  suffix="秒"
                  step={0.1}
                />
              )}

              {/* 計算結果表示 */}
              <div className="pt-2 border-t border-line text-xs text-ink-muted">
                → {calculated.summary}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default InputModeSelector;
