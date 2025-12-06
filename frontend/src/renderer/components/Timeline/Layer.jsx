import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDrop } from 'react-dnd';
import Clip, { ItemTypes } from './Clip';
import { moveClip, moveClipToLayer } from '../../store/timelineSlice';

function Layer({ layerId, layer, pixelsPerFrame }) {
  const dispatch = useDispatch();
  const selectedClipId = useSelector((state) => state.timeline.selectedClipId);
  const layerRef = useRef(null);

  const isVideoLayer = layer.type === 'video';

  // useDrop フック
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CLIP,
    drop: (item, monitor) => {
      if (!layerRef.current) return;

      // ドロップ位置を計算
      const offset = monitor.getClientOffset();
      const layerRect = layerRef.current.getBoundingClientRect();
      const dropX = offset.x - layerRect.left;
      const newStartFrame = Math.max(0, Math.round(dropX / pixelsPerFrame));

      // 同一レイヤー内移動か、レイヤー間移動かを判定
      if (item.layerId === layerId) {
        // 同一レイヤー内移動
        dispatch(moveClip({
          layerId,
          clipId: item.id,
          newStartFrame,
        }));
      } else {
        // レイヤー間移動
        dispatch(moveClipToLayer({
          fromLayerId: item.layerId,
          toLayerId: layerId,
          clipId: item.id,
          newStartFrame,
        }));
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [layerId, pixelsPerFrame, dispatch]);

  // ref を結合
  const setRefs = (el) => {
    layerRef.current = el;
    drop(el);
  };

  return (
    <div
      ref={setRefs}
      className={`h-12 relative border-b border-gray-700 ${
        isVideoLayer ? 'bg-gray-800/50' : 'bg-gray-800/30'
      } ${isOver && canDrop ? 'bg-blue-900/50' : ''}`}
    >
      {/* ������1�Th	 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700/50"
            style={{ left: `${i * 30 * pixelsPerFrame}px` }}
          />
        ))}
      </div>

      {/* ���� */}
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
