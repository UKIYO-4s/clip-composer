import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * 自動保存フック
 * 指定した間隔でプロジェクトデータを自動保存する
 *
 * @param {Object} options - オプション設定
 * @param {number} options.interval - 保存間隔（ミリ秒、デフォルト: 5分）
 * @param {boolean} options.enabled - 自動保存有効化フラグ
 * @param {Function} options.onSave - 保存時のコールバック
 * @param {Function} options.onError - エラー時のコールバック
 */
const useAutoSave = ({
  interval = 5 * 60 * 1000, // 5分
  enabled = true,
  onSave,
  onError,
} = {}) => {
  const timelineState = useSelector((state) => state.timeline);
  const projectState = useSelector((state) => state.project);

  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const intervalRef = useRef(null);
  const previousStateHashRef = useRef(null);
  const hasChangesRef = useRef(false);

  // 変更検知（軽量ハッシュ比較）
  const computeStateHash = useCallback(() => {
    // 完全なJSON.stringifyではなく、キーとなる値のみでハッシュを生成
    const timelineHash = timelineState?.currentFrame +
      ':' + Object.keys(timelineState?.layers || {}).length +
      ':' + Object.values(timelineState?.layers || {}).reduce((acc, layer) =>
        acc + (layer.clips?.length || 0), 0);
    const projectHash = projectState?.name || 'untitled';
    return `${timelineHash}:${projectHash}`;
  }, [timelineState, projectState]);

  // 変更フラグを更新（レンダリング後）
  useEffect(() => {
    const currentHash = computeStateHash();
    if (previousStateHashRef.current !== null && previousStateHashRef.current !== currentHash) {
      hasChangesRef.current = true;
    }
    previousStateHashRef.current = currentHash;
  }, [computeStateHash]);

  // 保存処理
  const performSave = useCallback(async () => {
    if (!enabled) return;
    if (!hasChangesRef.current) return;
    if (isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const projectData = {
        timeline: timelineState,
        project: projectState,
        savedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Electron IPC経由で保存
      if (window.api?.project?.autoSave) {
        await window.api.project.autoSave(projectData);
      } else {
        // localStorage へのフォールバック
        const autoSaveKey = `clip-composer-autosave-${projectState?.name || 'untitled'}`;
        localStorage.setItem(autoSaveKey, JSON.stringify(projectData));
      }

      // 状態を更新
      hasChangesRef.current = false;
      setLastSaveTime(new Date());

      if (onSave) {
        onSave(projectData);
      }
    } catch (error) {
      setSaveError(error.message);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [enabled, timelineState, projectState, onSave, onError, isSaving]);

  // 手動保存関数
  const manualSave = useCallback(async () => {
    hasChangesRef.current = true; // 強制的に保存
    await performSave();
  }, [performSave]);

  // インターバル設定
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, performSave]);

  // ブラウザ終了時の保存
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e) => {
      if (hasChangesRef.current) {
        // 非同期保存を試みる
        performSave();

        // 確認ダイアログ（オプション）
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, performSave]);

  return {
    lastSaveTime,
    isSaving,
    saveError,
    manualSave,
    hasUnsavedChanges: hasChangesRef.current,
  };
};

export default useAutoSave;
