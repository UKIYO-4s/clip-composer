import { createSlice } from '@reduxjs/toolkit';

// テスト用サンプルクリップ
const sampleClips = {
  V2: [
    { id: 'clip-1', type: 'video', name: 'Random Layer 1', startFrame: 0, durationFrames: 60 },
    { id: 'clip-2', type: 'text', name: 'Title Text', startFrame: 60, durationFrames: 90 },
  ],
  V1: [
    { id: 'clip-3', type: 'video', name: 'Random Layer 2', startFrame: 30, durationFrames: 120 },
    { id: 'clip-4', type: 'adjustment', name: 'Color Grade', startFrame: 150, durationFrames: 60 },
  ],
  S2: [
    { id: 'clip-5', type: 'bgm', name: 'Background Music', startFrame: 0, durationFrames: 300 },
  ],
  S1: [
    { id: 'clip-6', type: 'se', name: 'Sound Effect 1', startFrame: 60, durationFrames: 30 },
    { id: 'clip-7', type: 'se', name: 'Sound Effect 2', startFrame: 150, durationFrames: 30 },
  ],
};

const initialState = {
  layers: {
    V2: { id: 'V2', name: 'Video 2', type: 'video', clips: sampleClips.V2 },
    V1: { id: 'V1', name: 'Video 1', type: 'video', clips: sampleClips.V1 },
    S2: { id: 'S2', name: 'Sound 2', type: 'audio', clips: sampleClips.S2 },
    S1: { id: 'S1', name: 'Sound 1', type: 'audio', clips: sampleClips.S1 },
  },
  layerOrder: ['V2', 'V1', 'S2', 'S1'],
  currentFrame: 0,
  totalFrames: 900, // 30fps * 30s
  fps: 30,
  pixelsPerFrame: 2,
  selectedClipId: null,
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setCurrentFrame: (state, action) => {
      state.currentFrame = action.payload;
    },
    addClip: (state, action) => {
      const { layerId, clip } = action.payload;
      state.layers[layerId].clips.push(clip);
    },
    removeClip: (state, action) => {
      const { layerId, clipId } = action.payload;
      state.layers[layerId].clips = state.layers[layerId].clips.filter(
        (clip) => clip.id !== clipId
      );
    },
    updateClip: (state, action) => {
      const { layerId, clipId, updates } = action.payload;
      const clip = state.layers[layerId].clips.find((c) => c.id === clipId);
      if (clip) {
        Object.assign(clip, updates);
      }
    },
    selectClip: (state, action) => {
      state.selectedClipId = action.payload;
    },
    setPixelsPerFrame: (state, action) => {
      state.pixelsPerFrame = action.payload;
    },
  },
});

export const {
  setCurrentFrame,
  addClip,
  removeClip,
  updateClip,
  selectClip,
  setPixelsPerFrame,
} = timelineSlice.actions;

export default timelineSlice.reducer;
