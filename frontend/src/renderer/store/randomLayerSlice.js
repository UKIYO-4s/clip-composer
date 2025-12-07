import { createSlice, createSelector } from '@reduxjs/toolkit';

// シャッフル関数（Fisher-Yates）
const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const initialState = {
  layers: [],
  // 構造:
  // {
  //   id: string,
  //   name: string,           // 'ランダム1', 'ランダム2'...
  //   folderPath: string,     // '/path/to/folder'
  //   assets: string[],       // ['a.mp4', 'b.mp4', 'c.mp4']
  //   shuffledOrder: number[],// シャッフル済みインデックス
  //   currentIndex: number,   // 現在の使用位置
  //   createdAt: number,
  // }
};

const randomLayerSlice = createSlice({
  name: 'randomLayers',
  initialState,
  reducers: {
    // ランダムレイヤーを作成
    createRandomLayer: (state, action) => {
      const { name, folderPath, assets } = action.payload;
      const id = `random-layer-${Date.now()}`;

      state.layers.push({
        id,
        name: name || `ランダム${state.layers.length + 1}`,
        folderPath,
        assets,
        shuffledOrder: shuffleArray([...Array(assets.length).keys()]),
        currentIndex: 0,
        createdAt: Date.now(),
      });
    },

    // ランダムレイヤーを更新（フォルダ変更など）
    updateRandomLayer: (state, action) => {
      const { id, ...updates } = action.payload;
      const layer = state.layers.find(l => l.id === id);
      if (layer) {
        Object.assign(layer, updates);
        // assetsが変更されたらシャッフルをリセット
        if (updates.assets) {
          layer.shuffledOrder = shuffleArray([...Array(updates.assets.length).keys()]);
          layer.currentIndex = 0;
        }
      }
    },

    // 次の素材インデックスを取得して進める
    advanceToNextAsset: (state, action) => {
      const { layerId } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) return;

      layer.currentIndex++;

      // 全て使用済みならリシャッフル
      if (layer.currentIndex >= layer.assets.length) {
        layer.shuffledOrder = shuffleArray([...Array(layer.assets.length).keys()]);
        layer.currentIndex = 0;
      }
    },

    // 複数素材を一括取得（一括配置用）
    consumeMultipleAssets: (state, action) => {
      const { layerId, count } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) return;

      // 必要な回数だけ進める（リシャッフル含む）
      for (let i = 0; i < count; i++) {
        layer.currentIndex++;
        if (layer.currentIndex >= layer.assets.length) {
          layer.shuffledOrder = shuffleArray([...Array(layer.assets.length).keys()]);
          layer.currentIndex = 0;
        }
      }
    },

    // 使用状況をリセット
    resetLayerUsage: (state, action) => {
      const { layerId } = action.payload;
      const layer = state.layers.find(l => l.id === layerId);
      if (layer) {
        layer.shuffledOrder = shuffleArray([...Array(layer.assets.length).keys()]);
        layer.currentIndex = 0;
      }
    },

    // ランダムレイヤーを削除
    deleteRandomLayer: (state, action) => {
      const { layerId } = action.payload;
      state.layers = state.layers.filter(l => l.id !== layerId);
    },
  },
});

// セレクター
export const selectAllRandomLayers = (state) => state.randomLayers.layers;

export const selectRandomLayerById = (layerId) =>
  createSelector(
    selectAllRandomLayers,
    (layers) => layers.find(l => l.id === layerId)
  );

// 次に使用する素材のパスを取得（状態を変更しない読み取り専用）
export const selectNextAssets = (layerId, count) =>
  createSelector(
    selectAllRandomLayers,
    (layers) => {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return [];

      const result = [];
      let tempIndex = layer.currentIndex;
      let tempOrder = [...layer.shuffledOrder];

      for (let i = 0; i < count; i++) {
        if (tempIndex >= layer.assets.length) {
          tempOrder = shuffleArray([...Array(layer.assets.length).keys()]);
          tempIndex = 0;
        }
        const assetIndex = tempOrder[tempIndex];
        result.push(layer.assets[assetIndex]);
        tempIndex++;
      }

      return result;
    }
  );

export const {
  createRandomLayer,
  updateRandomLayer,
  advanceToNextAsset,
  consumeMultipleAssets,
  resetLayerUsage,
  deleteRandomLayer,
} = randomLayerSlice.actions;

export default randomLayerSlice.reducer;
