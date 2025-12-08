import React from 'react';
import { Button, Input } from '../ui';

/**
 * FolderSelector - フォルダ選択UIコンポーネント
 *
 * @param {Object} props
 * @param {string} props.folderPath - 選択されたフォルダパス
 * @param {Function} props.onSelect - 選択ボタンクリック時のハンドラー
 * @param {boolean} props.isLoading - ローディング状態
 * @param {string|null} props.error - エラーメッセージ
 * @param {Array} props.files - 検出されたファイル一覧
 * @param {number} props.totalCount - 総ファイル数
 * @param {string} props.label - ラベルテキスト
 * @param {string} props.placeholder - プレースホルダー
 * @param {number} props.previewLimit - プレビュー表示件数上限
 */
const FolderSelector = ({
  folderPath = '',
  onSelect,
  isLoading = false,
  error = null,
  files = [],
  totalCount = 0,
  label = '素材フォルダ',
  placeholder = '/path/to/folder',
  previewLimit = 10,
}) => {
  return (
    <div className="space-y-2">
      {/* ラベル */}
      <label className="text-xs font-medium text-ink-secondary">{label}</label>

      {/* 入力 + ボタン */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={folderPath}
          placeholder={placeholder}
          className="flex-1"
          readOnly
        />
        <Button
          variant="subtle"
          onClick={onSelect}
          disabled={isLoading}
        >
          {isLoading ? '読込中...' : '参照...'}
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="text-xs text-accent-red">{error}</div>
      )}

      {/* ファイル一覧プレビュー */}
      {files.length > 0 && (
        <div className="p-3 bg-surface-sunken rounded border border-line">
          <h3 className="text-sm font-medium text-ink-secondary mb-2">
            検出されたファイル ({totalCount}件)
          </h3>
          <div className="max-h-32 overflow-y-auto text-xs text-ink-muted space-y-1">
            {files.slice(0, previewLimit).map((file, i) => (
              <div key={i} className="truncate">{file.name}</div>
            ))}
            {totalCount > previewLimit && (
              <div className="text-ink-muted">...他 {totalCount - previewLimit} 件</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderSelector;
