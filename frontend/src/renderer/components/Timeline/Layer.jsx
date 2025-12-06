import React from 'react';
import { useSelector } from 'react-redux';
import Clip from './Clip';

function Layer({ layerId, layer, pixelsPerFrame }) {
  const selectedClipId = useSelector((state) => state.timeline.selectedClipId);

  const isVideoLayer = layer.type === 'video';

  return (
    <div
      className={`h-12 relative border-b border-gray-700 ${
        isVideoLayer ? 'bg-gray-800/50' : 'bg-gray-800/30'
      }`}
    >
      {/* ∞Í√…È§Û1“Th	 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700/50"
            style={{ left: `${i * 30 * pixelsPerFrame}px` }}
          />
        ))}
      </div>

      {/* ØÍ√◊ */}
      {layer.clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          layerId={layerId}
          pixelsPerFrame={pixelsPerFrame}
          isSelected={clip.id === selectedClipId}
        />
      ))}
    </div>
  );
}

export default Layer;
