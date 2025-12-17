import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // ステータス: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
  status: 'idle',
  // 利用可能なアップデート情報
  availableUpdate: null,
  // ダウンロード進捗
  downloadProgress: null,
  // エラーメッセージ
  error: null,
  // 現在のバージョン
  currentVersion: null,
  // バナー表示フラグ
  showBanner: false,
  // モーダル表示フラグ
  showModal: false,
  // リリースノートパネル表示フラグ
  showReleaseNotes: false,
  // ユーザーが「後で」を選択したかどうか
  dismissed: false,
};

const updateSlice = createSlice({
  name: 'update',
  initialState,
  reducers: {
    // アップデートチェック開始
    setChecking: (state) => {
      state.status = 'checking';
      state.error = null;
    },
    // アップデート利用可能
    setUpdateAvailable: (state, action) => {
      state.status = 'available';
      state.availableUpdate = action.payload;
      state.showBanner = true;
      state.dismissed = false;
    },
    // アップデートなし
    setUpdateNotAvailable: (state) => {
      state.status = 'idle';
      state.availableUpdate = null;
    },
    // ダウンロード開始
    setDownloading: (state) => {
      state.status = 'downloading';
      state.downloadProgress = { percent: 0 };
    },
    // ダウンロード進捗
    setDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },
    // ダウンロード完了
    setUpdateDownloaded: (state, action) => {
      state.status = 'downloaded';
      state.availableUpdate = action.payload;
      state.showBanner = true;
      state.showModal = true;
    },
    // エラー
    setError: (state, action) => {
      state.status = 'error';
      state.error = action.payload;
    },
    // 現在のバージョンを設定
    setCurrentVersion: (state, action) => {
      state.currentVersion = action.payload;
    },
    // バナーを閉じる
    dismissBanner: (state) => {
      state.showBanner = false;
      state.dismissed = true;
    },
    // モーダルを閉じる
    closeModal: (state) => {
      state.showModal = false;
    },
    // モーダルを開く
    openModal: (state) => {
      state.showModal = true;
    },
    // リリースノートパネルを開く
    openReleaseNotes: (state) => {
      state.showReleaseNotes = true;
    },
    // リリースノートパネルを閉じる
    closeReleaseNotes: (state) => {
      state.showReleaseNotes = false;
    },
    // 状態をリセット
    resetUpdateState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setChecking,
  setUpdateAvailable,
  setUpdateNotAvailable,
  setDownloading,
  setDownloadProgress,
  setUpdateDownloaded,
  setError,
  setCurrentVersion,
  dismissBanner,
  closeModal,
  openModal,
  openReleaseNotes,
  closeReleaseNotes,
  resetUpdateState,
} = updateSlice.actions;

export default updateSlice.reducer;
