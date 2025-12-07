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
    <h3 className="text-lg font-semibold text-ink-primary mb-6">Clip Types</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">Video</span>
        <ClipDemo type="video" name="Video Clip" duration="5.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">Text</span>
        <ClipDemo type="text" name="Title Text" duration="3.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">Image</span>
        <ClipDemo type="image" name="Background" duration="4.0s" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">Audio</span>
        <ClipDemo type="audio" name="BGM Track" duration="30.0s" width={240} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">SE</span>
        <ClipDemo type="se" name="Whoosh" duration="0.5s" width={80} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-secondary w-20">Adjust</span>
        <ClipDemo type="adjust" name="Color Grade" duration="10.0s" width={200} />
      </div>
    </div>
  </div>
);

export const ClipStates = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">Clip States</h3>

    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">Normal State</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="Video Clip" />
          <ClipDemo type="text" name="Text Clip" />
          <ClipDemo type="audio" name="Audio Clip" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">Selected State (with ring)</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="Video Clip" isSelected />
          <ClipDemo type="text" name="Text Clip" isSelected />
          <ClipDemo type="audio" name="Audio Clip" isSelected />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">Hover State (brightness)</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="Video Clip" isHovered />
          <ClipDemo type="text" name="Text Clip" isHovered />
          <ClipDemo type="audio" name="Audio Clip" isHovered />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">With Resize Handles</h4>
        <div className="flex gap-4">
          <ClipDemo type="video" name="Video Clip" showResizeHandles />
          <ClipDemo type="text" name="Text Clip" showResizeHandles />
          <ClipDemo type="audio" name="Audio Clip" showResizeHandles />
        </div>
      </div>
    </div>
  </div>
);

export const ClipWidths = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">Clip Widths (Duration)</h3>
    <div className="space-y-3">
      <ClipDemo type="se" name="Short" duration="0.3s" width={40} />
      <ClipDemo type="se" name="SE Effect" duration="0.5s" width={60} />
      <ClipDemo type="text" name="Quick Text" duration="1.0s" width={100} />
      <ClipDemo type="video" name="Medium Clip" duration="3.0s" width={180} />
      <ClipDemo type="audio" name="Long Audio Track" duration="15.0s" width={300} />
      <ClipDemo type="video" name="Extended Video Clip with Long Name" duration="30.0s" width={400} />
    </div>
  </div>
);

export const ClipColorContrast = () => (
  <div className="p-6 bg-surface-sunken rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">Color x Text Contrast</h3>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">Normal</h4>
        <div className="space-y-2">
          <ClipDemo type="video" name="Video Clip" />
          <ClipDemo type="text" name="Text Overlay" />
          <ClipDemo type="image" name="Image Layer" />
          <ClipDemo type="audio" name="Audio Track" />
          <ClipDemo type="se" name="Sound Effect" />
          <ClipDemo type="adjust" name="Adjustment" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink-secondary mb-3">Selected</h4>
        <div className="space-y-2">
          <ClipDemo type="video" name="Video Clip" isSelected />
          <ClipDemo type="text" name="Text Overlay" isSelected />
          <ClipDemo type="image" name="Image Layer" isSelected />
          <ClipDemo type="audio" name="Audio Track" isSelected />
          <ClipDemo type="se" name="Sound Effect" isSelected />
          <ClipDemo type="adjust" name="Adjustment" isSelected />
        </div>
      </div>
    </div>
  </div>
);

export const TimelineMockup = () => (
  <div className="p-6 bg-surface-base rounded-lg">
    <h3 className="text-lg font-semibold text-ink-primary mb-6">Timeline Context</h3>

    <div className="bg-surface-sunken p-4 rounded-lg border border-line">
      <div className="space-y-2">
        {/* Layer 1 - Video */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">Video</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-0 top-0 bottom-0">
              <ClipDemo type="video" name="Intro.mp4" duration="5.0s" width={150} />
            </div>
            <div className="absolute left-[160px] top-0 bottom-0">
              <ClipDemo type="video" name="Main.mp4" duration="10.0s" width={250} isSelected />
            </div>
          </div>
        </div>

        {/* Layer 2 - Text */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">Text</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-[40px] top-0 bottom-0">
              <ClipDemo type="text" name="Title" duration="3.0s" width={100} />
            </div>
            <div className="absolute left-[200px] top-0 bottom-0">
              <ClipDemo type="text" name="Subtitle" duration="4.0s" width={120} />
            </div>
          </div>
        </div>

        {/* Layer 3 - Audio */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">Audio</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-0 top-0 bottom-0">
              <ClipDemo type="audio" name="Background Music" duration="30.0s" width={420} />
            </div>
          </div>
        </div>

        {/* Layer 4 - SE */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted w-16">SE</span>
          <div className="flex-1 h-10 bg-surface-base rounded relative">
            <div className="absolute left-[20px] top-0 bottom-0">
              <ClipDemo type="se" name="Pop" duration="0.3s" width={40} />
            </div>
            <div className="absolute left-[150px] top-0 bottom-0">
              <ClipDemo type="se" name="Swoosh" duration="0.5s" width={50} />
            </div>
            <div className="absolute left-[350px] top-0 bottom-0">
              <ClipDemo type="se" name="Ding" duration="0.4s" width={45} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
