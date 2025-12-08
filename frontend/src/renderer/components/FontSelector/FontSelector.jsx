import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const FONT_LIST = [
  // 日本語フォント（システムフォント）
  { value: 'Hiragino Sans', label: 'ヒラギノ角ゴ', category: 'japanese' },
  { value: 'Hiragino Mincho ProN', label: 'ヒラギノ明朝', category: 'japanese' },
  { value: 'Yu Gothic', label: '游ゴシック', category: 'japanese' },
  { value: 'Yu Mincho', label: '游明朝', category: 'japanese' },
  { value: 'Meiryo', label: 'メイリオ', category: 'japanese' },
  { value: 'MS Gothic', label: 'ＭＳ ゴシック', category: 'japanese' },
  { value: 'MS Mincho', label: 'ＭＳ 明朝', category: 'japanese' },

  // 欧文フォント
  { value: 'Arial', label: 'Arial', category: 'sans-serif' },
  { value: 'Helvetica', label: 'Helvetica', category: 'sans-serif' },
  { value: 'Verdana', label: 'Verdana', category: 'sans-serif' },
  { value: 'Georgia', label: 'Georgia', category: 'serif' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
  { value: 'Courier New', label: 'Courier New', category: 'monospace' },
  { value: 'Impact', label: 'Impact', category: 'display' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS', category: 'display' },
];

const CATEGORY_LABELS = {
  japanese: '日本語',
  'sans-serif': 'Sans-Serif',
  serif: 'Serif',
  monospace: 'Monospace',
  display: 'Display',
};

const CATEGORY_ORDER = ['japanese', 'sans-serif', 'serif', 'monospace', 'display'];

const FontSelector = ({ value, onChange, previewText = 'サンプル Sample' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getCurrentLabel = () => {
    const font = FONT_LIST.find(f => f.value === value);
    return font ? font.label : value || 'フォントを選択';
  };

  const handleSelect = (fontValue) => {
    onChange(fontValue);
    setIsOpen(false);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const getFontsByCategory = (category) => {
    return FONT_LIST.filter(f => f.category === category);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="w-full px-3 py-2 text-left bg-surface-sunken border border-line rounded hover:bg-surface-base transition-colors flex items-center justify-between"
        onClick={toggleOpen}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink-primary">{getCurrentLabel()}</div>
          <div className="text-xs text-ink-secondary truncate" style={{ fontFamily: value }}>
            {previewText}
          </div>
        </div>
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-raised border border-line rounded shadow-lg max-h-64 overflow-y-auto">
          {CATEGORY_ORDER.map(category => {
            const fonts = getFontsByCategory(category);
            if (fonts.length === 0) return null;

            return (
              <div key={category}>
                <div className="px-3 py-1 text-xs font-medium text-ink-muted bg-surface-sunken sticky top-0">
                  {CATEGORY_LABELS[category]}
                </div>
                {fonts.map(font => (
                  <button
                    key={font.value}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-surface-sunken transition-colors ${
                      value === font.value ? 'bg-accent-blue/20' : ''
                    }`}
                    onClick={() => handleSelect(font.value)}
                  >
                    <div className="text-sm text-ink-primary">{font.label}</div>
                    <div className="text-xs text-ink-secondary truncate" style={{ fontFamily: font.value }}>
                      {previewText}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

FontSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  previewText: PropTypes.string,
};

export default FontSelector;
