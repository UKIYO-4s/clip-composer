import React from 'react';

export default {
  title: 'Foundation/Typography',
  parameters: {
    layout: 'padded',
  },
};

export const FontFamilies = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">フォントファミリー</h2>

    <div className="space-y-8">
      <div className="p-4 bg-surface-raised rounded border border-line">
        <h3 className="text-sm font-medium text-ink-secondary mb-3">Inter (sans)</h3>
        <p className="font-sans text-2xl text-ink-primary mb-2">
          クリップを組み合わせて動画を作成 The quick brown fox
        </p>
        <p className="font-sans text-base text-ink-secondary">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </p>
      </div>

      <div className="p-4 bg-surface-raised rounded border border-line">
        <h3 className="text-sm font-medium text-ink-secondary mb-3">JetBrains Mono (mono)</h3>
        <p className="font-mono text-2xl text-ink-primary mb-2">
          00:15.30 1080x1920 30fps
        </p>
        <p className="font-mono text-base text-ink-secondary">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </p>
      </div>
    </div>
  </div>
);

export const FontSizes = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">フォントサイズ</h2>

    <div className="space-y-4 bg-surface-raised p-4 rounded border border-line">
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">28px</span>
        <span className="text-[28px] text-ink-primary">ディスプレイ見出し</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">22px</span>
        <span className="text-[22px] text-ink-primary">大見出し</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">18px</span>
        <span className="text-[18px] text-ink-primary">中見出し</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">16px</span>
        <span className="text-[16px] text-ink-primary">本文（大）</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">14px</span>
        <span className="text-[14px] text-ink-primary">本文（標準）</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">13px</span>
        <span className="text-[13px] text-ink-primary">本文（小）</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">12px</span>
        <span className="text-[12px] text-ink-primary">キャプション</span>
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-ink-muted text-sm w-20">11px</span>
        <span className="text-[11px] text-ink-primary">極小</span>
      </div>
    </div>
  </div>
);

export const FontWeights = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">フォントウェイト</h2>

    <div className="space-y-4 bg-surface-raised p-4 rounded border border-line">
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">400 (normal)</span>
        <span className="text-xl font-normal text-ink-primary">標準のテキストスタイル</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">500 (medium)</span>
        <span className="text-xl font-medium text-ink-primary">中太のテキストスタイル</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">600 (semibold)</span>
        <span className="text-xl font-semibold text-ink-primary">太めのテキストスタイル</span>
      </div>
    </div>
  </div>
);

export const TextColors = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">テキストカラー</h2>

    <div className="space-y-4 bg-surface-raised p-4 rounded border border-line">
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">ink-primary</span>
        <span className="text-lg text-ink-primary">メインコンテンツ用のプライマリテキスト</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">ink-secondary</span>
        <span className="text-lg text-ink-secondary">補足情報用のセカンダリテキスト</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">ink-muted</span>
        <span className="text-lg text-ink-muted">ヒントやラベル用のミュートテキスト</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-ink-muted text-sm w-32">ink-disabled</span>
        <span className="text-lg text-ink-disabled">無効状態のテキスト</span>
      </div>
    </div>
  </div>
);

export const TypographyScale = () => (
  <div className="p-6 bg-surface-base">
    <h2 className="text-xl font-bold text-ink-primary mb-6">タイポグラフィスケール</h2>

    <div className="space-y-6 bg-surface-raised p-6 rounded border border-line">
      <div>
        <span className="text-xs text-ink-muted block mb-1">Display / 28px / Semibold</span>
        <h1 className="text-[28px] font-semibold text-ink-primary">Clip Composerへようこそ</h1>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Heading 1 / 22px / Semibold</span>
        <h2 className="text-[22px] font-semibold text-ink-primary">プロジェクトタイムライン</h2>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Heading 2 / 18px / Semibold</span>
        <h3 className="text-[18px] font-semibold text-ink-primary">動画設定</h3>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Heading 3 / 16px / Medium</span>
        <h4 className="text-[16px] font-medium text-ink-primary">書き出しオプション</h4>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Body / 14px / Normal</span>
        <p className="text-[14px] font-normal text-ink-primary">
          直感的なタイムラインエディターで魅力的なショート動画を作成。
          クリップをドラッグ＆ドロップして、エフェクトを追加し、数秒で書き出し。
        </p>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Caption / 12px / Normal</span>
        <p className="text-[12px] font-normal text-ink-secondary">
          長さ: 00:30 | 解像度: 1080x1920 | フォーマット: MP4
        </p>
      </div>

      <div>
        <span className="text-xs text-ink-muted block mb-1">Code / 13px / Mono</span>
        <code className="text-[13px] font-mono text-accent-cyan bg-surface-sunken px-2 py-1 rounded">
          ffmpeg -i input.mp4 -c:v libx264 output.mp4
        </code>
      </div>
    </div>
  </div>
);
