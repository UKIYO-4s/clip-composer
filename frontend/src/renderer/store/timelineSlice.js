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

// 履歴に保存する状態のスナップショットを作成
const createSnapshot = (state) => ({
  layers: JSON.parse(JSON.stringify(state.layers)),
  layerOrder: [...state.layerOrder],
});

// スナップショットから状態を復元
const restoreSnapshot = (state, snapshot) => {
  state.layers = snapshot.layers;
  state.layerOrder = snapshot.layerOrder;
};

const initialState = {
  // プロジェクト設定
  resolution: { width: 1080, height: 1920 },  // 縦動画デフォルト
  totalFrames: 900, // 30fps * 30s
  fps: 30,

  layers: {
    V2: { id: 'V2', name: 'Video 2', type: 'video', clips: sampleClips.V2 },
    V1: { id: 'V1', name: 'Video 1', type: 'video', clips: sampleClips.V1 },
    S2: { id: 'S2', name: 'Sound 2', type: 'audio', clips: sampleClips.S2 },
    S1: { id: 'S1', name: 'Sound 1', type: 'audio', clips: sampleClips.S1 },
  },
  layerOrder: ['V2', 'V1', 'S2', 'S1'],
  currentFrame: 0,
  pixelsPerFrame: 2,
  minPixelsPerFrame: 0.5,
  maxPixelsPerFrame: 20,
  selectedClipIds: [],
  isPlaying: false,
  loopEnabled: false,
  playbackRate: 1.0,

  // 履歴管理（Undo/Redo用）
  history: [],
  historyIndex: -1,
  maxHistoryLength: 50,

  // クリップボード（コピー/ペースト用）
  clipboard: [],

  // 新規プロジェクトダイアログ
  showNewProjectDialog: true,  // 起動時に表示
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    // プロジェクト設定
    initializeProject: (state, action) => {
      const { resolution, totalFrames, fps } = action.payload;
      state.resolution = resolution;
      state.totalFrames = totalFrames;
      state.fps = fps || 30;
      state.showNewProjectDialog = false;
      // クリップをクリア
      Object.keys(state.layers).forEach(layerId => {
        state.layers[layerId].clips = [];
      });
      state.currentFrame = 0;
      state.selectedClipIds = [];
      state.history = [];
      state.historyIndex = -1;
    },
    setShowNewProjectDialog: (state, action) => {
      state.showNewProjectDialog = action.payload;
    },
    setResolution: (state, action) => {
      state.resolution = action.payload;
    },
    setTotalFrames: (state, action) => {
      state.totalFrames = action.payload;
    },
    setFps: (state, action) => {
      state.fps = action.payload;
    },
    setCurrentFrame: (state, action) => {
      state.currentFrame = action.payload;
    },
    addClip: (state, action) => {
      const { layerId, clip, skipOverlapCheck } = action.payload;
      const layer = state.layers[layerId];

      if (!layer) {
        console.error(`addClip: Layer ${layerId} not found`);
        return;
      }

      if (skipOverlapCheck) {
        // 重複チェックをスキップ（一括配置用）
        layer.clips.push(clip);
      } else {
        // 重複処理
        const otherClips = handleClipOverlap(layer.clips, clip);

        // 削除されたクリップIDを選択から除外
        const removedClipIds = layer.clips
          .filter(c => !otherClips.find(oc => oc.id === c.id))
          .map(c => c.id);
        state.selectedClipIds = state.selectedClipIds.filter(id => !removedClipIds.includes(id));

        // クリップ配列を更新
        layer.clips = [...otherClips, clip];
      }
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
      state.pixelsPerFrame = Math.max(
        state.minPixelsPerFrame,
        Math.min(state.maxPixelsPerFrame, action.payload)
      );
    },
    // ズーム設定（クランピング付き）
    setZoom: (state, action) => {
      state.pixelsPerFrame = Math.max(
        state.minPixelsPerFrame,
        Math.min(state.maxPixelsPerFrame, action.payload)
      );
    },
    // ズームイン（1.25倍）
    zoomIn: (state) => {
      const newValue = state.pixelsPerFrame * 1.25;
      state.pixelsPerFrame = Math.min(state.maxPixelsPerFrame, newValue);
    },
    // ズームアウト（0.8倍）
    zoomOut: (state) => {
      const newValue = state.pixelsPerFrame * 0.8;
      state.pixelsPerFrame = Math.max(state.minPixelsPerFrame, newValue);
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
    // 選択クリップを別レイヤーに一括移動
    moveSelectedClipsToLayer: (state, action) => {
      const { targetLayerId } = action.payload;
      const targetLayer = state.layers[targetLayerId];
      if (!targetLayer) return;

      // 選択されたクリップを収集
      const clipsToMove = [];
      Object.values(state.layers).forEach(layer => {
        layer.clips.forEach(clip => {
          if (state.selectedClipIds.includes(clip.id)) {
            clipsToMove.push({
              clip: { ...clip },
              fromLayerId: layer.id,
            });
          }
        });
      });

      if (clipsToMove.length === 0) return;

      // 移動元から削除
      clipsToMove.forEach(({ clip, fromLayerId }) => {
        const fromLayer = state.layers[fromLayerId];
        fromLayer.clips = fromLayer.clips.filter(c => c.id !== clip.id);
      });

      // 移動先に追加（重複処理付き）
      let currentClips = [...targetLayer.clips];
      clipsToMove.forEach(({ clip }) => {
        // 重複処理
        currentClips = handleClipOverlap(currentClips, clip);
        // クリップを追加
        currentClips.push(clip);
      });

      // レイヤーを更新
      targetLayer.clips = currentClips;
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
    // 履歴に現在の状態を保存（アクション実行前に呼び出す）
    saveToHistory: (state) => {
      const snapshot = createSnapshot(state);

      // 現在位置より後ろの履歴を削除（新しいアクション時）
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }

      // スナップショットを追加
      state.history.push(snapshot);

      // 最大履歴数を超えた場合、古い履歴を削除
      if (state.history.length > state.maxHistoryLength) {
        state.history.shift();
      } else {
        state.historyIndex++;
      }
    },
    // Undo
    undo: (state) => {
      if (state.historyIndex >= 0 && state.history.length > 0) {
        restoreSnapshot(state, state.history[state.historyIndex]);
        state.historyIndex--;
        state.selectedClipIds = [];
      }
    },
    // Redo
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreSnapshot(state, state.history[state.historyIndex]);
        state.selectedClipIds = [];
      }
    },
    // クリップをコピー
    copyClips: (state, action) => {
      const { clipIds } = action.payload;
      const copiedClips = [];

      Object.values(state.layers).forEach(layer => {
        layer.clips.forEach(clip => {
          if (clipIds.includes(clip.id)) {
            copiedClips.push({
              ...clip,
              sourceLayerId: layer.id,
            });
          }
        });
      });

      state.clipboard = copiedClips;
    },
    // クリップをペースト
    pasteClips: (state, action) => {
      const { targetFrame } = action.payload;
      if (state.clipboard.length === 0) return;

      // 最小開始フレームを計算（相対位置を維持）
      const minStartFrame = Math.min(...state.clipboard.map(c => c.startFrame));
      const frameOffset = targetFrame - minStartFrame;

      state.clipboard.forEach(clip => {
        const targetLayerId = clip.sourceLayerId;
        const layer = state.layers[targetLayerId];
        if (!layer) return;

        const newClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          startFrame: clip.startFrame + frameOffset,
        };
        delete newClip.sourceLayerId;

        layer.clips.push(newClip);
      });
    },
    // 全クリップ選択
    selectAllClips: (state) => {
      const allClipIds = [];
      Object.values(state.layers).forEach(layer => {
        layer.clips.forEach(clip => {
          allClipIds.push(clip.id);
        });
      });
      state.selectedClipIds = allClipIds;
    },
    // プロジェクトファイルからタイムライン状態を復元
    loadTimeline: (state, action) => {
      const { layers, layerOrder, totalFrames, resolution, fps } = action.payload;

      // レイヤーとクリップを復元
      if (layers) {
        state.layers = layers;
      }
      if (layerOrder) {
        state.layerOrder = layerOrder;
      }
      if (totalFrames !== undefined) {
        state.totalFrames = totalFrames;
      }
      if (resolution) {
        state.resolution = resolution;
      }
      if (fps !== undefined) {
        state.fps = fps;
      }

      // 状態をリセット
      state.currentFrame = 0;
      state.selectedClipIds = [];
      state.isPlaying = false;
      state.history = [];
      state.historyIndex = -1;
      state.showNewProjectDialog = false;
    },
  },
});

export const {
  // プロジェクト設定
  initializeProject,
  setShowNewProjectDialog,
  setResolution,
  setTotalFrames,
  setFps,
  // タイムライン
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
  setZoom,
  zoomIn,
  zoomOut,
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
  moveSelectedClipsToLayer,
  setIsPlaying,
  setLoopEnabled,
  setPlaybackRate,
  saveToHistory,
  undo,
  redo,
  copyClips,
  pasteClips,
  selectAllClips,
  loadTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;

// セレクター
export const selectResolution = (state) => state.timeline.resolution;
export const selectShowNewProjectDialog = (state) => state.timeline.showNewProjectDialog;
export const selectCurrentFrame = (state) => state.timeline.currentFrame;
export const selectTotalFrames = (state) => state.timeline.totalFrames;
export const selectFps = (state) => state.timeline.fps;
export const selectIsPlaying = (state) => state.timeline.isPlaying;
export const selectLoopEnabled = (state) => state.timeline.loopEnabled;
export const selectLayers = (state) => state.timeline.layers;
export const selectLayerOrder = (state) => state.timeline.layerOrder;
export const selectCanUndo = (state) => state.timeline.historyIndex >= 0 && state.timeline.history.length > 0;
export const selectCanRedo = (state) => state.timeline.historyIndex < state.timeline.history.length - 1;
export const selectClipboardLength = (state) => state.timeline.clipboard.length;
export const selectPixelsPerFrame = (state) => state.timeline.pixelsPerFrame;
export const selectMinPixelsPerFrame = (state) => state.timeline.minPixelsPerFrame;
export const selectMaxPixelsPerFrame = (state) => state.timeline.maxPixelsPerFrame;

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
