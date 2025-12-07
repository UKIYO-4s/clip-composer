import { createSlice, createSelector } from '@reduxjs/toolkit';

// ユニークID生成
const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// テスト用サンプルクリップ
const sampleClips = {
  V2: [
    {
      id: 'clip-1',
      type: 'video',
      name: 'Random Layer 1',
      startFrame: 0,
      durationFrames: 60,
      opacity: 100,
      scale: 100,
      positionX: 0,
      positionY: 0,
      rotation: 0,
    },
    {
      id: 'clip-2',
      type: 'text',
      name: 'Title Text',
      startFrame: 60,
      durationFrames: 90,
      opacity: 100,
      textContent: 'サンプルテキスト',
      fontSize: 48,
      textColor: '#ffffff',
      bgColor: '#000000',
    },
  ],
  V1: [
    {
      id: 'clip-3',
      type: 'video',
      name: 'Random Layer 2',
      startFrame: 30,
      durationFrames: 120,
      opacity: 100,
      scale: 100,
      positionX: 0,
      positionY: 0,
      rotation: 0,
    },
    {
      id: 'clip-4',
      type: 'adjustment',
      name: 'Color Grade',
      startFrame: 150,
      durationFrames: 60,
      opacity: 100,
    },
  ],
  S2: [
    {
      id: 'clip-5',
      type: 'bgm',
      name: 'Background Music',
      startFrame: 0,
      durationFrames: 300,
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
    },
  ],
  S1: [
    {
      id: 'clip-6',
      type: 'se',
      name: 'Sound Effect 1',
      startFrame: 60,
      durationFrames: 30,
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
    },
    {
      id: 'clip-7',
      type: 'se',
      name: 'Sound Effect 2',
      startFrame: 150,
      durationFrames: 30,
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
    },
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
  isPlaying: false,
  loopEnabled: false,
  playbackRate: 1.0,
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
    resizeClipStart: (state, action) => {
      const { layerId, clipId, newStartFrame } = action.payload;
      const clip = state.layers[layerId].clips.find((c) => c.id === clipId);
      if (clip) {
        const originalEndFrame = clip.startFrame + clip.durationFrames;
        const newDuration = originalEndFrame - newStartFrame;
        if (newDuration >= 1) {
          clip.startFrame = newStartFrame;
          clip.durationFrames = newDuration;
        }
      }
    },
    resizeClipEnd: (state, action) => {
      const { layerId, clipId, newDurationFrames } = action.payload;
      const clip = state.layers[layerId].clips.find((c) => c.id === clipId);
      if (clip && newDurationFrames >= 1) {
        clip.durationFrames = newDurationFrames;
      }
    },
    splitClip: (state, action) => {
      const { layerId, clipId, splitFrame } = action.payload;
      const layer = state.layers[layerId];
      const clipIndex = layer.clips.findIndex((c) => c.id === clipId);

      if (clipIndex === -1) return;

      const clip = layer.clips[clipIndex];
      const clipEndFrame = clip.startFrame + clip.durationFrames;

      // 分割フレームがクリップの範囲内にあるかチェック
      if (splitFrame <= clip.startFrame || splitFrame >= clipEndFrame) return;

      // 前半クリップ（元のクリップを更新）
      const firstHalfDuration = splitFrame - clip.startFrame;

      // 後半クリップ（新規作成）
      const secondHalfClip = {
        ...clip,
        id: `${clip.id}-split-${Date.now()}`,
        startFrame: splitFrame,
        durationFrames: clipEndFrame - splitFrame,
      };

      // 元のクリップの長さを更新
      clip.durationFrames = firstHalfDuration;

      // 後半クリップを配列に追加
      layer.clips.splice(clipIndex + 1, 0, secondHalfClip);
    },
    duplicateClip: (state, action) => {
      const { layerId, clipId } = action.payload;
      const layer = state.layers[layerId];
      const clip = layer.clips.find((c) => c.id === clipId);

      if (!clip) return;

      const duplicatedClip = {
        ...clip,
        id: `${clip.id}-dup-${Date.now()}`,
        startFrame: clip.startFrame + clip.durationFrames,
      };

      layer.clips.push(duplicatedClip);
    },
    // ドラッグ&ドロップ: 同一レイヤー内での移動
    moveClip: (state, action) => {
      const { layerId, clipId, newStartFrame } = action.payload;
      const clip = state.layers[layerId].clips.find((c) => c.id === clipId);
      if (clip) {
        clip.startFrame = Math.max(0, newStartFrame);
      }
    },
    // ドラッグ&ドロップ: レイヤー間移動
    moveClipToLayer: (state, action) => {
      const { fromLayerId, toLayerId, clipId, newStartFrame } = action.payload;
      const fromLayer = state.layers[fromLayerId];
      const toLayer = state.layers[toLayerId];

      // 移動元からクリップを検索
      const clipIndex = fromLayer.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return;

      // クリップを取り出し
      const [clip] = fromLayer.clips.splice(clipIndex, 1);

      // 新しい位置を設定
      clip.startFrame = Math.max(0, newStartFrame);

      // 移動先レイヤーに追加
      toLayer.clips.push(clip);
    },
    // 再生コントロール
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setLoopEnabled: (state, action) => {
      state.loopEnabled = action.payload;
    },
    setPlaybackRate: (state, action) => {
      state.playbackRate = action.payload;
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
  resizeClipStart,
  resizeClipEnd,
  splitClip,
  duplicateClip,
  moveClip,
  moveClipToLayer,
  setIsPlaying,
  setLoopEnabled,
  setPlaybackRate,
} = timelineSlice.actions;

export default timelineSlice.reducer;

// セレクター
export const selectCurrentFrame = (state) => state.timeline.currentFrame;
export const selectTotalFrames = (state) => state.timeline.totalFrames;
export const selectFps = (state) => state.timeline.fps;
export const selectIsPlaying = (state) => state.timeline.isPlaying;
export const selectLoopEnabled = (state) => state.timeline.loopEnabled;
export const selectLayers = (state) => state.timeline.layers;
export const selectLayerOrder = (state) => state.timeline.layerOrder;

// 現在フレームで表示すべきクリップを取得するセレクター（メモ化版）
export const selectVisibleClips = createSelector(
  [selectLayers, selectLayerOrder, selectCurrentFrame],
  (layers, layerOrder, currentFrame) => {
    const visibleClips = [];

    [...layerOrder].reverse().forEach((layerId) => {
      const layer = layers[layerId];
      layer.clips.forEach((clip) => {
        const clipEndFrame = clip.startFrame + clip.durationFrames;
        if (currentFrame >= clip.startFrame && currentFrame < clipEndFrame) {
          visibleClips.push({
            ...clip,
            layerId,
            layerType: layer.type,
          });
        }
      });
    });

    return visibleClips;
  }
);
