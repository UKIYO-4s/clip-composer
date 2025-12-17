import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  setChecking,
  setUpdateAvailable,
  setUpdateNotAvailable,
  setDownloadProgress,
  setUpdateDownloaded,
  setError,
  setCurrentVersion,
} from '../../store/updateSlice';

/**
 * アップデートイベントをリッスンしてReduxに反映するhook
 */
function useUpdateListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 現在のバージョンを取得
    const fetchVersion = async () => {
      try {
        const version = await window.api.update.getVersion();
        dispatch(setCurrentVersion(version));
      } catch (err) {
        console.error('Failed to get app version:', err);
      }
    };
    fetchVersion();

    // イベントリスナーを設定
    const unsubscribeChecking = window.api.update.onChecking(() => {
      dispatch(setChecking());
    });

    const unsubscribeAvailable = window.api.update.onUpdateAvailable((data) => {
      dispatch(setUpdateAvailable(data));
    });

    const unsubscribeNotAvailable = window.api.update.onUpdateNotAvailable(() => {
      dispatch(setUpdateNotAvailable());
    });

    const unsubscribeProgress = window.api.update.onDownloadProgress((data) => {
      dispatch(setDownloadProgress(data));
    });

    const unsubscribeDownloaded = window.api.update.onUpdateDownloaded((data) => {
      dispatch(setUpdateDownloaded(data));
    });

    const unsubscribeError = window.api.update.onError((data) => {
      dispatch(setError(data.message));
    });

    // クリーンアップ
    return () => {
      unsubscribeChecking?.();
      unsubscribeAvailable?.();
      unsubscribeNotAvailable?.();
      unsubscribeProgress?.();
      unsubscribeDownloaded?.();
      unsubscribeError?.();
    };
  }, [dispatch]);
}

export default useUpdateListener;
