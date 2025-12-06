import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  layers: {
    V2: { clips: [] },
    V1: { clips: [] },
    S2: { clips: [] },
    S1: { clips: [] },
  },
  currentFrame: 0,
  duration: 900, // 30fps * 30s
  frameRate: 30,
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
  },
});

export const { setCurrentFrame, addClip, removeClip, updateClip } = timelineSlice.actions;
export default timelineSlice.reducer;
