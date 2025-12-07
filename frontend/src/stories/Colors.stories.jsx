import React from 'react';

export default {
  title: 'Foundation/Colors',
  parameters: {
    layout: 'padded',
  },
};

const ColorSwatch = ({ name, value, textColor = 'text-ink-primary' }) => (
  <div className="flex items-center gap-3 p-2 rounded bg-surface-raised border border-line">
    <div
      className="w-12 h-12 rounded border border-line-bright"
      style={{ backgroundColor: value }}
    />
    <div className="flex flex-col">
      <span className={`text-sm font-medium ${textColor}`}>{name}</span>
      <span className="text-xs font-mono text-ink-muted">{value}</span>
    </div>
  </div>
);

const ColorGroup = ({ title, colors }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-ink-primary mb-4">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {colors.map(({ name, value, textColor }) => (
        <ColorSwatch key={name} name={name} value={value} textColor={textColor} />
      ))}
    </div>
  </div>
);

export const AllColors = () => (
  <div className="p-6 bg-surface-base min-h-screen">
    <h1 className="text-2xl font-bold text-ink-primary mb-8">カラーパレット</h1>

    <ColorGroup
      title="Surface（背景）"
      colors={[
        { name: 'base', value: '#0d0f14' },
        { name: 'sunken', value: '#0b0d11' },
        { name: 'raised', value: '#11141d' },
        { name: 'highest', value: '#161a24' },
      ]}
    />

    <ColorGroup
      title="Ink（テキスト）"
      colors={[
        { name: 'primary', value: '#e7ecf4' },
        { name: 'secondary', value: '#9aa3b8' },
        { name: 'muted', value: '#6b7387' },
        { name: 'disabled', value: '#4b5161' },
      ]}
    />

    <ColorGroup
      title="Line（ボーダー）"
      colors={[
        { name: 'subtle', value: '#1d2230' },
        { name: 'default', value: '#252b3a' },
        { name: 'bright', value: '#2f3547' },
      ]}
    />

    <ColorGroup
      title="Accent（アクセント）"
      colors={[
        { name: 'blue', value: '#2aa6ff' },
        { name: 'cyan', value: '#3ccfda' },
        { name: 'magenta', value: '#c26cff' },
        { name: 'green', value: '#3ad7a4' },
        { name: 'amber', value: '#f2c14f' },
        { name: 'red', value: '#ff7b72' },
      ]}
    />

    <ColorGroup
      title="Track（トラックタイプ）"
      colors={[
        { name: 'video（動画）', value: '#1d7fcc' },
        { name: 'text（テキスト）', value: '#d4952a' },
        { name: 'image（画像）', value: '#2ba88a' },
        { name: 'audio（BGM）', value: '#3d5fb8' },
        { name: 'se（効果音）', value: '#2e8da8' },
        { name: 'adjust（調整）', value: '#9b4fd6' },
      ]}
    />
  </div>
);

export const SurfaceColors = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">背景カラー</h2>
    <div className="space-y-4">
      <div className="p-4 bg-surface-base border border-line rounded">
        <span className="text-ink-primary">surface-base: #0d0f14（ベース）</span>
      </div>
      <div className="p-4 bg-surface-sunken border border-line rounded">
        <span className="text-ink-primary">surface-sunken: #0b0d11（沈み込み）</span>
      </div>
      <div className="p-4 bg-surface-raised border border-line rounded">
        <span className="text-ink-primary">surface-raised: #11141d（浮き上がり）</span>
      </div>
      <div className="p-4 bg-surface-highest border border-line rounded">
        <span className="text-ink-primary">surface-highest: #161a24（最上位）</span>
      </div>
    </div>
  </div>
);

export const InkColors = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">テキストカラー</h2>
    <div className="space-y-4 bg-surface-raised p-4 rounded border border-line">
      <p className="text-ink-primary">ink-primary: #e7ecf4 - メインテキスト</p>
      <p className="text-ink-secondary">ink-secondary: #9aa3b8 - 補助テキスト</p>
      <p className="text-ink-muted">ink-muted: #6b7387 - 控えめテキスト</p>
      <p className="text-ink-disabled">ink-disabled: #4b5161 - 無効テキスト</p>
    </div>
  </div>
);

export const AccentColors = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">アクセントカラー</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="p-4 bg-accent-blue rounded text-white text-center font-medium">
        blue: #2aa6ff
      </div>
      <div className="p-4 bg-accent-cyan rounded text-surface-base text-center font-medium">
        cyan: #3ccfda
      </div>
      <div className="p-4 bg-accent-magenta rounded text-white text-center font-medium">
        magenta: #c26cff
      </div>
      <div className="p-4 bg-accent-green rounded text-surface-base text-center font-medium">
        green: #3ad7a4
      </div>
      <div className="p-4 bg-accent-amber rounded text-surface-base text-center font-medium">
        amber: #f2c14f
      </div>
      <div className="p-4 bg-accent-red rounded text-white text-center font-medium">
        red: #ff7b72
      </div>
    </div>
  </div>
);

export const TrackColors = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">トラックタイプカラー</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="p-4 bg-track-video rounded text-white text-center font-medium">
        video（動画）: #1d7fcc
      </div>
      <div className="p-4 bg-track-text rounded text-white text-center font-medium">
        text（テキスト）: #d4952a
      </div>
      <div className="p-4 bg-track-image rounded text-white text-center font-medium">
        image（画像）: #2ba88a
      </div>
      <div className="p-4 bg-track-audio rounded text-white text-center font-medium">
        audio（BGM）: #3d5fb8
      </div>
      <div className="p-4 bg-track-se rounded text-white text-center font-medium">
        se（効果音）: #2e8da8
      </div>
      <div className="p-4 bg-track-adjust rounded text-white text-center font-medium">
        adjust（調整）: #9b4fd6
      </div>
    </div>
  </div>
);
