import { createSlice, createSelector } from '@reduxjs/toolkit';

// ユニークID生成
const generateId = () => `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// サンプル素材（デモ用）
const sampleAssets = [
  {
    id: 'sample-1',
    name: 'sample_video.mp4',
    type: 'video',
    path: '/samples/sample_video.mp4',
    duration: 300, // フレーム数
    thumbnail: null,
  },
  {
    id: 'sample-2',
    name: 'background.jpg',
    type: 'image',
    path: '/samples/background.jpg',
    thumbnail: null,
  },
  {
    id: 'sample-3',
    name: 'bgm_track.mp3',
    type: 'audio',
    path: '/samples/bgm_track.mp3',
    duration: 600,
    thumbnail: null,
  },
];

const initialState = {
  items: sampleAssets,
  selectedAssetId: null,
  filter: 'all', // 'all', 'video', 'image', 'audio'
  searchQuery: '',
};

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    addAsset: (state, action) => {
      const asset = {
        id: generateId(),
        ...action.payload,
      };
      state.items.push(asset);
    },
    addAssets: (state, action) => {
      const newAssets = action.payload.map((asset) => ({
        id: generateId(),
        ...asset,
      }));
      state.items.push(...newAssets);
    },
    removeAsset: (state, action) => {
      state.items = state.items.filter((asset) => asset.id !== action.payload);
      if (state.selectedAssetId === action.payload) {
        state.selectedAssetId = null;
      }
    },
    selectAsset: (state, action) => {
      state.selectedAssetId = action.payload;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    updateAssetThumbnail: (state, action) => {
      const { assetId, thumbnail } = action.payload;
      const asset = state.items.find((a) => a.id === assetId);
      if (asset) {
        asset.thumbnail = thumbnail;
      }
    },
    // Update asset duration (by id or by path)
    updateAssetDuration: (state, action) => {
      const { id, path, duration } = action.payload;
      let asset;
      if (id) {
        asset = state.items.find((a) => a.id === id);
      } else if (path) {
        // Find by path if id not provided
        asset = state.items.find((a) => a.path === path);
      }
      if (asset) {
        asset.duration = duration;
      }
    },
    // プロジェクトファイルからアセット状態を復元
    setAssets: (state, action) => {
      state.items = action.payload || [];
      state.selectedAssetId = null;
    },
    // アセットをクリア
    clearAssets: (state) => {
      state.items = [];
      state.selectedAssetId = null;
    },
  },
});

export const {
  addAsset,
  addAssets,
  removeAsset,
  selectAsset,
  setFilter,
  setSearchQuery,
  updateAssetThumbnail,
  updateAssetDuration,
  setAssets,
  clearAssets,
} = assetsSlice.actions;

export default assetsSlice.reducer;

// セレクター
export const selectAllAssets = (state) => state.assets.items;
export const selectSelectedAssetId = (state) => state.assets.selectedAssetId;
export const selectFilter = (state) => state.assets.filter;
export const selectSearchQuery = (state) => state.assets.searchQuery;

// フィルタリングされた素材を取得（メモ化版）
export const selectFilteredAssets = createSelector(
  [selectAllAssets, selectFilter, selectSearchQuery],
  (items, filter, searchQuery) => {
    return items.filter((asset) => {
      // タイプフィルター
      if (filter !== 'all' && asset.type !== filter) {
        return false;
      }
      // 検索フィルター
      if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }
);
