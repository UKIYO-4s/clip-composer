import React from 'react';
import PropTypes from 'prop-types';

const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'ExtraLight' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'ExtraBold' },
  { value: 900, label: 'Black' },
];

const FontStyleControls = ({
  fontWeight = 400,
  onFontWeightChange,
  isBold = false,
  onBoldChange,
  isItalic = false,
  onItalicChange,
  strokeWidth = 0,
  onStrokeWidthChange,
  strokeColor = '#000000',
  onStrokeColorChange,
  previewText = 'サンプル',
  fontFamily = 'sans-serif',
}) => {
  return (
    <div className="space-y-3">
      {/* ウェイト選択 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-ink-secondary">ウェイト</label>
        <select
          value={fontWeight}
          onChange={(e) => onFontWeightChange(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
        >
          {FONT_WEIGHTS.map(w => (
            <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
          ))}
        </select>
      </div>

      {/* スタイルボタン（太字・斜体） */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-ink-secondary">スタイル</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onBoldChange(!isBold)}
            className={`px-4 py-2 text-sm font-bold border rounded transition-colors ${
              isBold
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-surface-sunken border-line text-ink-primary hover:bg-surface-base'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => onItalicChange(!isItalic)}
            className={`px-4 py-2 text-sm italic border rounded transition-colors ${
              isItalic
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-surface-sunken border-line text-ink-primary hover:bg-surface-base'
            }`}
          >
            I
          </button>
        </div>
      </div>

      {/* 境界線（ストローク） */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-ink-secondary">境界線</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Math.max(0, Number(e.target.value)))}
            min={0}
            max={10}
            step={0.5}
            className="w-20 px-3 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            placeholder="幅"
          />
          <span className="text-xs text-ink-muted">px</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="w-8 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
          />
          <input
            type="text"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="flex-1 px-2 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
          />
        </div>
      </div>

      {/* プレビュー */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-ink-secondary">スタイルプレビュー</label>
        <div className="p-3 bg-surface-sunken rounded border border-line text-center">
          <span
            style={{
              fontFamily: fontFamily,
              fontWeight: isBold ? 'bold' : fontWeight,
              fontStyle: isItalic ? 'italic' : 'normal',
              WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : 'none',
            }}
          >
            {previewText}
          </span>
        </div>
      </div>
    </div>
  );
};

FontStyleControls.propTypes = {
  fontWeight: PropTypes.number,
  onFontWeightChange: PropTypes.func.isRequired,
  isBold: PropTypes.bool,
  onBoldChange: PropTypes.func.isRequired,
  isItalic: PropTypes.bool,
  onItalicChange: PropTypes.func.isRequired,
  strokeWidth: PropTypes.number,
  onStrokeWidthChange: PropTypes.func.isRequired,
  strokeColor: PropTypes.string,
  onStrokeColorChange: PropTypes.func.isRequired,
  previewText: PropTypes.string,
  fontFamily: PropTypes.string,
};

export default FontStyleControls;
