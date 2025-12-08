import { useState, useCallback } from 'react';

/**
 * useFolderSelection - フォルダ選択とファイル一覧取得フック
 *
 * @param {Object} options
 * @param {string[]} options.extensions - 許可する拡張子 (デフォルト: ビデオファイル)
 * @returns {Object} フォルダ選択関連の状態とハンドラー
 */
export const useFolderSelection = (options = {}) => {
  const {
    extensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
  } = options;

  // 状態
  const [folderPath, setFolderPath] = useState('');
  const [files, setFiles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // フォルダ選択ハンドラー
  const selectFolder = useCallback(async () => {
    setError(null);

    try {
      const result = await window.api.selectFolder();
      if (result.canceled || !result.folderPath) {
        return { canceled: true };
      }

      setFolderPath(result.folderPath);
      setIsLoading(true);

      const filesResult = await window.api.listFolderFiles(result.folderPath, extensions);
      setIsLoading(false);

      if (filesResult.ok) {
        setFiles(filesResult.files);
        setTotalCount(filesResult.totalCount);
        setError(null);
        return { canceled: false, files: filesResult.files, totalCount: filesResult.totalCount };
      } else {
        setFiles([]);
        setTotalCount(0);
        setError(filesResult.message);
        return { canceled: false, error: filesResult.message };
      }
    } catch (err) {
      setIsLoading(false);
      setFiles([]);
      setTotalCount(0);
      setError(err.message || '不明なエラーが発生しました');
      return { canceled: false, error: err.message };
    }
  }, [extensions]);

  // リセットハンドラー
  const reset = useCallback(() => {
    setFolderPath('');
    setFiles([]);
    setTotalCount(0);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    // 状態
    folderPath,
    files,
    totalCount,
    isLoading,
    error,
    // ハンドラー
    selectFolder,
    reset,
    // 手動設定用
    setFolderPath,
  };
};

export default useFolderSelection;
