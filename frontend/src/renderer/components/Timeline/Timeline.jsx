import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentFrame } from '../../store/timelineSlice';
import Layer from './Layer';

function Timeline() {
  const dispatch = useDispatch();
  const {
    layers,
    layerOrder,
    currentFrame,
    totalFrames,
    fps,
    pixelsPerFrame,
  } = useSelector((state) => state.timeline);

  const timelineRef = useRef(null);

  // Õìüà’¿¤à³üÉbk	Û (HH:MM:SS:FF)
  const frameToTimecode = (frame) => {
    const totalSeconds = Math.floor(frame / fps);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const frames = frame % fps;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  // ¿¤àé¤ó¯êÃ¯gØÃÉ’ûÕ
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft - 80; // 80px oì¤äüéÙëE
    const frame = Math.max(0, Math.min(Math.floor(x / pixelsPerFrame), totalFrames));
    dispatch(setCurrentFrame(frame));
  };

  // ¿¤àëüéünîÛŠ’
  const renderTimeRuler = () => {
    const marks = [];
    const secondWidth = fps * pixelsPerFrame;
    const totalSeconds = Math.ceil(totalFrames / fps);

    for (let i = 0; i <= totalSeconds; i++) {
      const isMainMark = i % 5 === 0;
      marks.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${i * secondWidth}px` }}
        >
          <div
            className={`w-px ${isMainMark ? 'h-4 bg-gray-400' : 'h-2 bg-gray-600'}`}
          />
          {isMainMark && (
            <span className="text-xs text-gray-400 mt-1">{i}s</span>
          )}
        </div>
      );
    }
    return marks;
  };

  const timelineWidth = totalFrames * pixelsPerFrame;

  return (
    <div className="flex flex-col h-64 bg-gray-900 border-t border-gray-700">
      {/* ¿¤à³üÉh: */}
      <div className="flex items-center h-8 bg-gray-800 border-b border-gray-700 px-4">
        <div className="w-20 text-sm text-gray-400">Time:</div>
        <div className="font-mono text-sm text-white">
          {frameToTimecode(currentFrame)}
        </div>
        <div className="ml-4 text-xs text-gray-500">
          Frame: {currentFrame} / {totalFrames}
        </div>
      </div>

      {/* ¿¤àé¤ó,S */}
      <div className="flex flex-1 overflow-hidden">
        {/* ì¤äüéÙëúš	 */}
        <div className="w-20 flex-shrink-0 bg-gray-800 border-r border-gray-700">
          {/* ¿¤àëüéün¹Úü¹ */}
          <div className="h-6 border-b border-gray-700" />
          {/* ì¤äüéÙë */}
          {layerOrder.map((layerId) => (
            <div
              key={layerId}
              className={`h-12 flex items-center px-2 border-b border-gray-700 ${
                layers[layerId].type === 'video'
                  ? 'bg-blue-900/30'
                  : 'bg-purple-900/30'
              }`}
            >
              <span className="text-xs font-medium text-gray-300">
                {layers[layerId].name}
              </span>
            </div>
          ))}
        </div>

        {/* ¹¯íüëïıj¿¤àé¤óß */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
        >
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          >
            {/* ¿¤àëüéü */}
            <div className="h-6 relative bg-gray-800 border-b border-gray-700">
              {renderTimeRuler()}
            </div>

            {/* ì¤äü */}
            {layerOrder.map((layerId) => (
              <Layer
                key={layerId}
                layerId={layerId}
                layer={layers[layerId]}
                pixelsPerFrame={pixelsPerFrame}
              />
            ))}

            {/* ØÃÉ */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{ left: `${currentFrame * pixelsPerFrame}px` }}
            >
              {/* ØÃÉnÏóÉë */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
