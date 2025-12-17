import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTimeOnly } from '../store/exportSlice';

/**
 * エクスポート中のタイマーをリアルタイム更新するフック
 * isExporting=true の間、毎秒 elapsed と ETA を再計算して dispatch
 */
export function useExportTimer() {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);

  const isExporting = useSelector((state) => state.export.isExporting);
  const exportStartTime = useSelector((state) => state.export.exportStartTime);
  const lastProgressPercent = useSelector((state) => state.export.lastProgressPercent);

  useEffect(() => {
    // エクスポート中でない場合はタイマーをクリア
    if (!isExporting) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 既にタイマーが動いていればスキップ
    if (intervalRef.current) {
      return;
    }

    // ETA計算用のヘルパー関数（最小値0.001を使用して開始直後から動作）
    const calculateEta = (elapsed, progress) => {
      // 進捗が100%未満の場合のみETA計算
      if (progress >= 100) return 0;
      // 最小値0.001を使用して開始直後からETAを算出
      const p = Math.max(progress, 0.001);
      // elapsed : p% = total : 100%
      // remaining = elapsed * (100 - p) / p
      return Math.ceil(elapsed * (100 - p) / p);
    };

    // 毎秒タイマーを更新
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const startTime = exportStartTime || now;
      const elapsed = Math.floor((now - startTime) / 1000);
      const estimatedRemaining = calculateEta(elapsed, lastProgressPercent);

      dispatch(updateTimeOnly({
        elapsedTime: elapsed,
        estimatedRemaining: estimatedRemaining,
      }));
    }, 1000);

    // 初回即時更新
    const now = Date.now();
    const startTime = exportStartTime || now;
    const elapsed = Math.floor((now - startTime) / 1000);
    const initialEta = calculateEta(elapsed, lastProgressPercent);
    dispatch(updateTimeOnly({
      elapsedTime: elapsed,
      estimatedRemaining: initialEta,
    }));

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isExporting, dispatch, exportStartTime, lastProgressPercent]);

  // フックからは何も返さない（副作用のみ）
}

export default useExportTimer;
