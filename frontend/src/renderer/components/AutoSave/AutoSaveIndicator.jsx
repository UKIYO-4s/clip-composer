import React from 'react';
import useAutoSave from '../../hooks/useAutoSave';
import { Loader2, Check, AlertCircle } from '../Icons';

/**
 * 自動保存状態インジケーター
 * ステータスバーなどに配置して自動保存の状態を表示
 */
const AutoSaveIndicator = ({
  enabled = true,
  interval = 5 * 60 * 1000, // 5分
  showLastSaveTime = true,
}) => {
  const { lastSaveTime, isSaving, saveError, hasUnsavedChanges } = useAutoSave({
    enabled,
    interval,
  });

  // フォーマット済み時刻
  const formattedTime = lastSaveTime
    ? lastSaveTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* 保存中インジケーター */}
      {isSaving && (
        <div className="flex items-center gap-1 text-accent-blue">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>保存中...</span>
        </div>
      )}

      {/* エラー表示 */}
      {saveError && !isSaving && (
        <div className="flex items-center gap-1 text-accent-red">
          <AlertCircle className="w-3 h-3" />
          <span>保存エラー</span>
        </div>
      )}

      {/* 正常状態 */}
      {!isSaving && !saveError && (
        <>
          {/* 未保存の変更がある場合 */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-accent-amber">
              <div className="w-2 h-2 bg-accent-amber rounded-full" />
              <span>未保存</span>
            </div>
          )}

          {/* 最終保存時刻 */}
          {showLastSaveTime && formattedTime && !hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-ink-muted">
              <Check className="w-3 h-3" />
              <span>保存済 {formattedTime}</span>
            </div>
          )}

          {/* 自動保存無効 */}
          {!enabled && (
            <div className="flex items-center gap-1 text-ink-disabled">
              <span>自動保存: オフ</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutoSaveIndicator;
