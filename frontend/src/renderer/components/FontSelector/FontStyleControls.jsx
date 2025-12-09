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

const STROKE_POSITIONS = [
  { value: 'outside', label: '外側' },
  { value: 'center', label: '中央' },
  { value: 'inside', label: '内側' },
];

const BLEND_MODES = [
  { value: 'normal', label: '通常' },
  { value: 'multiply', label: '乗算' },
  { value: 'screen', label: 'スクリーン' },
  { value: 'overlay', label: 'オーバーレイ' },
  { value: 'darken', label: '比較(暗)' },
  { value: 'lighten', label: '比較(明)' },
  { value: 'color-dodge', label: '覆い焼き' },
  { value: 'color-burn', label: '焼き込み' },
  { value: 'hard-light', label: 'ハードライト' },
  { value: 'soft-light', label: 'ソフトライト' },
  { value: 'difference', label: '差の絶対値' },
  { value: 'exclusion', label: '除外' },
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
  strokePosition = 'center',
  onStrokePositionChange,
  blendMode = 'normal',
  onBlendModeChange,
  letterSpacing = 0,
  onLetterSpacingChange,
  textOpacity = 100,
  onTextOpacityChange,
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
      <div className="space-y-2">
        <label className="text-xs font-medium text-ink-secondary">境界線</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Math.max(0, Number(e.target.value)))}
            min={0}
            max={10}
            step={0.5}
            className="w-16 px-2 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            placeholder="幅"
          />
          <span className="text-xs text-ink-muted">px</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="w-8 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
          />
          <select
            value={strokePosition}
            onChange={(e) => onStrokePositionChange(e.target.value)}
            className="flex-1 px-2 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
          >
            {STROKE_POSITIONS.map(pos => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ブレンドモード */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-ink-secondary">ブレンドモード</label>
        <select
          value={blendMode}
          onChange={(e) => onBlendModeChange(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
        >
          {BLEND_MODES.map(mode => (
            <option key={mode.value} value={mode.value}>{mode.label}</option>
          ))}
        </select>
      </div>

      {/* カーニング・不透明度 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-secondary">文字間隔</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={letterSpacing}
              onChange={(e) => onLetterSpacingChange(Number(e.target.value))}
              min={-20}
              max={100}
              step={0.5}
              className="flex-1 px-2 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            />
            <span className="text-xs text-ink-muted">px</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-secondary">不透明度</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={textOpacity}
              onChange={(e) => onTextOpacityChange(Math.min(100, Math.max(0, Number(e.target.value))))}
              min={0}
              max={100}
              className="flex-1 px-2 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            />
            <span className="text-xs text-ink-muted">%</span>
          </div>
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
              paintOrder: strokePosition === 'outside' ? 'stroke fill' : 'fill stroke',
              letterSpacing: `${letterSpacing}px`,
              opacity: textOpacity / 100,
              mixBlendMode: blendMode,
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
  strokePosition: PropTypes.oneOf(['outside', 'center', 'inside']),
  onStrokePositionChange: PropTypes.func,
  blendMode: PropTypes.string,
  onBlendModeChange: PropTypes.func,
  letterSpacing: PropTypes.number,
  onLetterSpacingChange: PropTypes.func,
  textOpacity: PropTypes.number,
  onTextOpacityChange: PropTypes.func,
  previewText: PropTypes.string,
  fontFamily: PropTypes.string,
};

export default FontStyleControls;
