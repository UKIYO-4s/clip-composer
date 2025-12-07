import React from 'react';

const SELECTION_MODES = {
  random: {
    label: 'ランダム',
    description: '毎回ランダムに選択（A→A→C→B→A）',
  },
  sequential: {
    label: '順番',
    description: '順番通りに繰り返し（A→B→C→A→B）',
  },
  shuffle: {
    label: 'シャッフル',
    description: '重複なしで全素材使用後リセット（B→A→C→A→B）',
  },
};

export const SelectionModeSelect = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-ink-secondary">素材選択モード</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 text-sm bg-surface-sunken border border-line rounded text-ink-primary"
      >
        {Object.entries(SELECTION_MODES).map(([key, mode]) => (
          <option key={key} value={key}>
            {mode.label}
          </option>
        ))}
      </select>

      {/* 常時表示の説明 */}
      <div className="p-2 bg-surface-sunken rounded text-xs text-ink-secondary">
        <strong>{SELECTION_MODES[value].label}:</strong> {SELECTION_MODES[value].description}
      </div>
    </div>
  );
};

export default SelectionModeSelect;
