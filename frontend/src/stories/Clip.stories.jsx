import React from 'react';

export default {
  title: 'Components/Clip',
  parameters: {
    layout: 'padded',
  },
};

const ClipDemo = ({
  type,
  name,
  duration = '2.5s',
  isSelected = false,
  isHovered = false,
  showResizeHandles = false,
  width = 180,
}) => {
  const colorMap = {
    video: 'bg-track-video',
    text: 'bg-track-text',
    image: 'bg-track-image',
    audio: 'bg-track-audio',
    se: 'bg-track-se',
    adjust: 'bg-track-adjust',
  };

  return (
    <div
      className={`
        relative h-10 rounded
        ${colorMap[type] || 'bg-surface-raised'}
        border border-line
        shadow-[0_1px_0_rgba(0,0,0,0.35)]
        ${isHovered ? 'brightness-110' : ''}
        flex items-center px-2
        ${isSelected ? 'ring-2 ring-accent-blue/80 shadow-glow-blue' : ''}
        overflow-hidden
        transition-all duration-100
        group
      `}
      style={{ width: `${width}px` }}
    >
      {showResizeHandles && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-ink-primary/80 cursor-ew-resize z-10" />
      )}

      <div className="flex flex-col justify-center min-w-0 w-full">
        <div className="text-[12px] font-semibold text-ink-primary truncate">
          {name}
        </div>
        <div className="text-[12px] text-ink-primary opacity-80">
          {duration}
        </div>
      </div>

      {showResizeHandles && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-ink-primary/80 cursor-ew-resize z-10" />
      )}
    </div>
  );
};

export const AllClipTypes = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">クリップタイプ</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">動画</span>
        <ClipDemo type="video" name="動画クリップ" duration="5.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">テキスト</span>
        <ClipDemo type="text" name="タイトルテキスト" duration="3.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">画像</span>
        <ClipDemo type="image" name="背景画像" duration="4.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">BGM</span>
        <ClipDemo type="audio" name="BGMトラック" duration="30.0s" width={240} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">効果音</span>
        <ClipDemo type="se" name="シュッ" duration="0.5s" width={80} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">調整</span>
        <ClipDemo type="adjust" name="カラーグレード" duration="10.0s" width={200} />
      </div>
    </div>
  </div>
);

export const ClipStates = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">クリップの状態</h3>

    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">通常状態</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="動画クリップ" />
          <ClipDemo type="text" name="テキストクリップ" />
          <ClipDemo type="audio" name="オーディオクリップ" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">選択状態（リング表示）</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="動画クリップ" isSelected />
          <ClipDemo type="text" name="テキストクリップ" isSelected />
          <ClipDemo type="audio" name="オーディオクリップ" isSelected />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">ホバー状態（明るさ変化）</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="動画クリップ" isHovered />
          <ClipDemo type="text" name="テキストクリップ" isHovered />
          <ClipDemo type="audio" name="オーディオクリップ" isHovered />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">リサイズハンドル表示</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="動画クリップ" showResizeHandles />
          <ClipDemo type="text" name="テキストクリップ" showResizeHandles />
          <ClipDemo type="audio" name="オーディオクリップ" showResizeHandles />
        </div>
      </div>
    </div>
  </div>
);

export const ClipWidths = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">クリップ幅（長さ）</h3>
    <div className="space-y-3">
      <ClipDemo type="se" name="短い" duration="0.3s" width={40} />
      <ClipDemo type="se" name="効果音" duration="0.5s" width={60} />
      <ClipDemo type="text" name="クイックテキスト" duration="1.0s" width={100} />
      <ClipDemo type="video" name="標準クリップ" duration="3.0s" width={180} />
      <ClipDemo type="audio" name="長めのオーディオトラック" duration="15.0s" width={300} />
      <ClipDemo type="video" name="とても長いクリップ名のテスト" duration="30.0s" width={400} />
    </div>
  </div>
);

export const ClipColorContrast = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">カラーとテキストのコントラスト</h3>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">通常</h4>
        <div className="space-y-2">
          <ClipDemo type="video" name="動画クリップ" />
          <ClipDemo type="text" name="テキストオーバーレイ" />
          <ClipDemo type="image" name="画像レイヤー" />
          <ClipDemo type="audio" name="オーディオトラック" />
          <ClipDemo type="se" name="効果音" />
          <ClipDemo type="adjust" name="調整レイヤー" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">選択時</h4>
        <div className="space-y-2">
          <ClipDemo type="video" name="動画クリップ" isSelected />
          <ClipDemo type="text" name="テキストオーバーレイ" isSelected />
          <ClipDemo type="image" name="画像レイヤー" isSelected />
          <ClipDemo type="audio" name="オーディオトラック" isSelected />
          <ClipDemo type="se" name="効果音" isSelected />
          <ClipDemo type="adjust" name="調整レイヤー" isSelected />
        </div>
      </div>
    </div>
  </div>
);

export const TimelineMockup = () => (
  <div className="p-6 bg-surface-base rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">タイムライン表示例</h3>

    <div className="bg-surface-sunken p-4 rounded-lg border border-line">
      <div className="space-y-2">
        {/* Layer 1 - Video */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">動画</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-0 top-0 bottom-0">
              <ClipDemo type="video" name="イントロ.mp4" duration="5.0s" width={150} />
            </div>
            <div className="absolute left-[160px] top-0 bottom-0">
              <ClipDemo type="video" name="メイン.mp4" duration="10.0s" width={250} isSelected />
            </div>
          </div>
        </div>

        {/* Layer 2 - Text */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">テキスト</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-[40px] top-0 bottom-0">
              <ClipDemo type="text" name="タイトル" duration="3.0s" width={100} />
            </div>
            <div className="absolute left-[200px] top-0 bottom-0">
              <ClipDemo type="text" name="字幕" duration="4.0s" width={120} />
            </div>
          </div>
        </div>

        {/* Layer 3 - Audio */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">BGM</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-0 top-0 bottom-0">
              <ClipDemo type="audio" name="バックグラウンドBGM" duration="30.0s" width={420} />
            </div>
          </div>
        </div>

        {/* Layer 4 - SE */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">効果音</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-[20px] top-0 bottom-0">
              <ClipDemo type="se" name="ポン" duration="0.3s" width={40} />
            </div>
            <div className="absolute left-[150px] top-0 bottom-0">
              <ClipDemo type="se" name="シュッ" duration="0.5s" width={50} />
            </div>
            <div className="absolute left-[350px] top-0 bottom-0">
              <ClipDemo type="se" name="チーン" duration="0.4s" width={45} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
