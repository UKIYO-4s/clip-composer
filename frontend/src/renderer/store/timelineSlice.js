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

/**
 * クリップの重複を処理する
 * @param {Array} clips - レイヤー内の全クリップ配列
 * @param {Object} newClip - 新しく配置/移動されるクリップ
 * @returns {Array} 処理後のクリップ配列
 */
const handleClipOverlap = (clips, newClip) => {
  const newStart = newClip.startFrame;
  const newEnd = newClip.startFrame + newClip.durationFrames;
  const result = [];

  for (const clip of clips) {
    // 自分自身はスキップ
    if (clip.id === newClip.id) continue;

    const clipStart = clip.startFrame;
    const clipEnd = clip.startFrame + clip.durationFrames;

    // 重なりなし
    if (clipEnd <= newStart || clipStart >= newEnd) {
      result.push(clip);
      continue;
    }

    // ケース4: 完全に含まれる → 削除（pushしない）
    if (clipStart >= newStart && clipEnd <= newEnd) {
      continue;
    }

    // ケース1: 完全に覆う → 分割
    if (clipStart < newStart && clipEnd > newEnd) {
      // 前半部分
      result.push({
        ...clip,
        durationFrames: newStart - clipStart,
      });
      // 後半部分（新しいIDで）
      result.push({
        ...clip,
        id: `${clip.id}-split-${Date.now()}`,
        startFrame: newEnd,
        durationFrames: clipEnd - newEnd,
      });
      continue;
    }

    // ケース2: 左側が重なる → 右側トリム
    if (clipStart < newStart && clipEnd > newStart) {
      result.push({
        ...clip,
        durationFrames: newStart - clipStart,
      });
      continue;
    }

    // ケース3: 右側が重なる → 左側トリム
    if (clipStart < newEnd && clipEnd > newEnd) {
      result.push({
        ...clip,
        startFrame: newEnd,
        durationFrames: clipEnd - newEnd,
      });
      continue;
    }
  }

  return result;
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
  selectedClipIds: [],
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
      const layer = state.layers[layerId];

      // 重複処理
      const otherClips = handleClipOverlap(layer.clips, clip);

      // 削除されたクリップIDを選択から除外
      const removedClipIds = layer.clips
        .filter(c => !otherClips.find(oc => oc.id === c.id))
        .map(c => c.id);
      state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

      // クリップ配列を更新
      layer.clips = [...otherClips, clip];
    },
    removeClip: (state, action) => {
      const { layerId, clipId } = action.payload;
      state.layers[layerId].clips = state.layers[layerId].clips.filter(
        (clip) => clip.id !== clipId
      );
    },
    // 複数クリップ削除
    removeClips: (state, action) => {
      const { clipIds } = action.payload;

      // 各レイヤーからクリップを削除
      Object.values(state.layers).forEach(layer => {
        layer.clips = layer.clips.filter(clip => !clipIds.includes(clip.id));
      });

      // 選択状態をクリア
      state.selectedClipIds = [];
    },
    updateClip: (state, action) => {
      const { layerId, clipId, updates } = action.payload;
      const clip = state.layers[layerId].clips.find((c) => c.id === clipId);
      if (clip) {
        Object.assign(clip, updates);
      }
    },
    // 単一選択（他の選択を解除）
    selectClip: (state, action) => {
      const clipId = action.payload.clipId || action.payload;
      state.selectedClipIds = [clipId];
    },
    // 選択トグル（Shift+クリック用）
    toggleClipSelection: (state, action) => {
      const { clipId } = action.payload;
      const index = state.selectedClipIds.indexOf(clipId);
      if (index === -1) {
        state.selectedClipIds.push(clipId);
      } else {
        state.selectedClipIds.splice(index, 1);
      }
    },
    // 選択解除
    clearSelection: (state) => {
      state.selectedClipIds = [];
    },
    // 複数選択（範囲選択用）
    selectClips: (state, action) => {
      const { clipIds } = action.payload;
      state.selectedClipIds = clipIds;
    },
    // 選択に追加（Shiftキー併用時）
    addToSelection: (state, action) => {
      const { clipIds } = action.payload;
      const newIds = clipIds.filter(id => !state.selectedClipIds.includes(id));
      state.selectedClipIds = [...state.selectedClipIds, ...newIds];
    },
    // Videoレイヤー追加
    addVideoLayer: (state) => {
      // 現在のVideoレイヤーの最大番号を取得
      const videoLayerIds = Object.keys(state.layers).filter(id => id.startsWith('V'));
      const maxNum = videoLayerIds.length > 0
        ? Math.max(...videoLayerIds.map(id => parseInt(id.slice(1)) || 0))
        : 0;
      const newNum = maxNum + 1;
      const newLayerId = `V${newNum}`;

      // 新しいレイヤーを追加
      state.layers[newLayerId] = {
        id: newLayerId,
        name: `Video ${newNum}`,
        type: 'video',
        clips: [],
      };

      // layerOrderに追加（Soundレイヤーの前に挿入）
      const soundIndex = state.layerOrder.findIndex(id => id.startsWith('S'));
      if (soundIndex === -1) {
        state.layerOrder.push(newLayerId);
      } else {
        state.layerOrder.splice(soundIndex, 0, newLayerId);
      }
    },
    // Soundレイヤー追加
    addSoundLayer: (state) => {
      // 現在のSoundレイヤーの最大番号を取得
      const soundLayerIds = Object.keys(state.layers).filter(id => id.startsWith('S'));
      const maxNum = soundLayerIds.length > 0
        ? Math.max(...soundLayerIds.map(id => parseInt(id.slice(1)) || 0))
        : 0;
      const newNum = maxNum + 1;
      const newLayerId = `S${newNum}`;

      // 新しいレイヤーを追加
      state.layers[newLayerId] = {
        id: newLayerId,
        name: `Sound ${newNum}`,
        type: 'audio',
        clips: [],
      };

      // layerOrderの末尾に追加
      state.layerOrder.push(newLayerId);
    },
    // レイヤー削除
    removeLayer: (state, action) => {
      const { layerId } = action.payload;
      const isVideo = layerId.startsWith('V');

      // 同タイプのレイヤー数をカウント
      const sameTypeCount = Object.keys(state.layers).filter(id =>
        isVideo ? id.startsWith('V') : id.startsWith('S')
      ).length;

      // 最低1つは残す
      if (sameTypeCount <= 1) return;

      // 削除されたレイヤーのクリップが選択されている場合は選択解除
      const layerClipIds = state.layers[layerId]?.clips.map(c => c.id) || [];
      state.selectedClipIds = state.selectedClipIds.filter(id => !layerClipIds.includes(id));

      // レイヤーを削除
      delete state.layers[layerId];
      state.layerOrder = state.layerOrder.filter(id => id !== layerId);
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
    // Option+ドラッグ: クリップを指定位置に複製
    duplicateClipToPosition: (state, action) => {
      const { fromLayerId, toLayerId, clipId, newStartFrame } = action.payload;
      const fromLayer = state.layers[fromLayerId];
      const toLayer = state.layers[toLayerId];

      const clip = fromLayer.clips.find((c) => c.id === clipId);
      if (!clip) return;

      const duplicatedClip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        startFrame: Math.max(0, newStartFrame),
      };

      // 重複処理
      const otherClips = handleClipOverlap(toLayer.clips, duplicatedClip);

      // 削除されたクリップIDを選択から除外
      const removedClipIds = toLayer.clips
        .filter(c => !otherClips.find(oc => oc.id === c.id))
        .map(c => c.id);
      state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

      // クリップ配列を更新
      toLayer.clips = [...otherClips, duplicatedClip];
    },
    // Option+ドラッグ: 複数クリップを指定位置に複製
    duplicateClipsToPosition: (state, action) => {
      const { clips, toLayerId, frameOffset } = action.payload;
      const toLayer = state.layers[toLayerId];
      let currentClips = [...toLayer.clips];

      clips.forEach(({ fromLayerId, clipId, originalStartFrame }) => {
        const fromLayer = state.layers[fromLayerId];
        const clip = fromLayer.clips.find((c) => c.id === clipId);
        if (!clip) return;

        const duplicatedClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${clipId.slice(-4)}`,
          startFrame: Math.max(0, originalStartFrame + frameOffset),
        };

        // 重複処理
        currentClips = handleClipOverlap(currentClips, duplicatedClip);

        // 削除されたクリップIDを選択から除外
        const removedClipIds = toLayer.clips
          .filter(c => !currentClips.find(oc => oc.id === c.id))
          .map(c => c.id);
        state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

        // クリップを追加
        currentClips.push(duplicatedClip);
      });

      // レイヤーを更新
      toLayer.clips = currentClips;
    },
    // ドラッグ&ドロップ: 同一レイヤー内での移動
    moveClip: (state, action) => {
      const { layerId, clipId, newStartFrame } = action.payload;
      const layer = state.layers[layerId];
      const clip = layer.clips.find((c) => c.id === clipId);
      if (!clip) return;

      // 新しい位置でのクリップ情報
      const movedClip = { ...clip, startFrame: Math.max(0, newStartFrame) };

      // 重複処理
      const otherClips = handleClipOverlap(layer.clips, movedClip);

      // 削除されたクリップIDを選択から除外
      const removedClipIds = layer.clips
        .filter(c => c.id !== clipId && !otherClips.find(oc => oc.id === c.id))
        .map(c => c.id);
      state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

      // クリップ配列を更新
      layer.clips = [...otherClips, movedClip];
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

      // 移動先レイヤーで重複処理
      const otherClips = handleClipOverlap(toLayer.clips, clip);

      // 削除されたクリップIDを選択から除外
      const removedClipIds = toLayer.clips
        .filter(c => !otherClips.find(oc => oc.id === c.id))
        .map(c => c.id);
      state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

      // クリップ配列を更新
      toLayer.clips = [...otherClips, clip];
    },
    // 複数クリップ移動(フレーム差分ベース)
    moveClipsWithDelta: (state, action) => {
      const { clipMoves, deltaFrame, targetLayerId } = action.payload;
      // clipMoves: [{ fromLayerId, clipId, originalStartFrame }]

      // 移動するクリップを収集
      const clipsToMove = [];
      clipMoves.forEach(({ fromLayerId, clipId, originalStartFrame }) => {
        const fromLayer = state.layers[fromLayerId];
        if (!fromLayer) return;

        const clip = fromLayer.clips.find(c => c.id === clipId);
        if (!clip) return;

        clipsToMove.push({
          clip,
          fromLayerId,
          newStartFrame: Math.max(0, originalStartFrame + deltaFrame),
        });
      });

      // レイヤーごとにグループ化して処理
      const layerGroups = {};
      clipsToMove.forEach(({ clip, fromLayerId, newStartFrame }) => {
        const destLayerId = targetLayerId || fromLayerId;
        if (!layerGroups[destLayerId]) {
          layerGroups[destLayerId] = [];
        }
        layerGroups[destLayerId].push({ clip, fromLayerId, newStartFrame });
      });

      // 各レイヤーで重複処理
      Object.entries(layerGroups).forEach(([destLayerId, moves]) => {
        const destLayer = state.layers[destLayerId];
        let currentClips = [...destLayer.clips];

        // 移動元から削除（レイヤー間移動の場合）
        moves.forEach(({ clip, fromLayerId }) => {
          if (fromLayerId !== destLayerId) {
            const fromLayer = state.layers[fromLayerId];
            fromLayer.clips = fromLayer.clips.filter(c => c.id !== clip.id);
          } else {
            // 同一レイヤー内移動の場合は一旦除外
            currentClips = currentClips.filter(c => c.id !== clip.id);
          }
        });

        // 各クリップを新しい位置に配置
        moves.forEach(({ clip, newStartFrame }) => {
          const movedClip = { ...clip, startFrame: newStartFrame };

          // 重複処理
          currentClips = handleClipOverlap(currentClips, movedClip);

          // 削除されたクリップIDを選択から除外
          const removedClipIds = destLayer.clips
            .filter(c => c.id !== movedClip.id && !currentClips.find(oc => oc.id === c.id))
            .map(c => c.id);
          state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

          // クリップを追加
          currentClips.push(movedClip);
        });

        // レイヤーを更新
        destLayer.clips = currentClips;
      });
    },
    // 複数クリップ複製（フレーム差分ベース）
    duplicateClipsWithDelta: (state, action) => {
      const { clipMoves, deltaFrame, targetLayerId } = action.payload;
      // clipMoves: [{ fromLayerId, clipId, originalStartFrame }]

      // 複製するクリップを収集
      const clipsToDuplicate = [];
      clipMoves.forEach(({ fromLayerId, clipId, originalStartFrame }) => {
        const fromLayer = state.layers[fromLayerId];
        if (!fromLayer) return;

        const clip = fromLayer.clips.find(c => c.id === clipId);
        if (!clip) return;

        clipsToDuplicate.push({
          clip,
          fromLayerId,
          newStartFrame: Math.max(0, originalStartFrame + deltaFrame),
        });
      });

      // レイヤーごとにグループ化して処理
      const layerGroups = {};
      clipsToDuplicate.forEach(({ clip, fromLayerId, newStartFrame }) => {
        const destLayerId = targetLayerId || fromLayerId;
        if (!layerGroups[destLayerId]) {
          layerGroups[destLayerId] = [];
        }
        layerGroups[destLayerId].push({ clip, newStartFrame });
      });

      // 各レイヤーで重複処理
      Object.entries(layerGroups).forEach(([destLayerId, duplicates]) => {
        const destLayer = state.layers[destLayerId];
        let currentClips = [...destLayer.clips];

        // 各クリップを複製して配置
        duplicates.forEach(({ clip, newStartFrame }) => {
          const duplicatedClip = {
            ...clip,
            id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${clip.id.slice(-4)}`,
            startFrame: newStartFrame,
          };

          // 重複処理
          currentClips = handleClipOverlap(currentClips, duplicatedClip);

          // 削除されたクリップIDを選択から除外
          const removedClipIds = destLayer.clips
            .filter(c => !currentClips.find(oc => oc.id === c.id))
            .map(c => c.id);
          state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

          // クリップを追加
          currentClips.push(duplicatedClip);
        });

        // レイヤーを更新
        destLayer.clips = currentClips;
      });
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
  removeClips,
  updateClip,
  selectClip,
  toggleClipSelection,
  clearSelection,
  selectClips,
  addToSelection,
  addVideoLayer,
  addSoundLayer,
  removeLayer,
  setPixelsPerFrame,
  resizeClipStart,
  resizeClipEnd,
  splitClip,
  duplicateClip,
  duplicateClipToPosition,
  duplicateClipsToPosition,
  moveClip,
  moveClipToLayer,
  moveClipsWithDelta,
  duplicateClipsWithDelta,
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
