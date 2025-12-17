import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAllRandomLayers,
  selectIsPanelOpen,
  updateRandomLayer,
  deleteRandomLayer,
  resetLayerUsage,
  closeRandomLayerPanel,
} from '../../store/randomLayerSlice';
import { selectLayers } from '../../store/timelineSlice';
import { Button, IconButton, Input } from '../ui';
import { X, Folder, RefreshCw, Trash2 } from '../Icons';

/**
 * ランダムレイヤー管理パネル
 * - 全ランダムレイヤーを一覧表示
 * - フォルダパスの確認・変更
 * - 参照クリップ数の表示
 */
const RandomLayerPanel = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectIsPanelOpen);

  const handleClose = useCallback(() => {
    dispatch(closeRandomLayerPanel());
  }, [dispatch]);
  const randomLayers = useSelector(selectAllRandomLayers);
  const timelineLayers = useSelector(selectLayers);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 各ランダムレイヤーを参照しているクリップ数を計算
  const clipCountByLayerId = useMemo(() => {
    const counts = {};
    Object.values(timelineLayers).forEach(layer => {
      layer.clips.forEach(clip => {
        if (clip.randomLayerId) {
          counts[clip.randomLayerId] = (counts[clip.randomLayerId] || 0) + 1;
        }
      });
    });
    return counts;
  }, [timelineLayers]);

  // フォルダ変更ハンドラー
  const handleChangeFolder = useCallback(async (layerId) => {
    try {
      const result = await window.api.selectDirectory({
        title: 'ランダムレイヤーのフォルダを選択',
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const newFolderPath = result.filePaths[0];
      setIsLoading(true);

      // フォルダ内のファイル一覧を取得
      const files = await window.api.fs.readDir(newFolderPath);
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const allowedExtensions = [...videoExtensions, ...imageExtensions];

      const assets = files
        .filter(file => {
          const ext = file.toLowerCase().slice(file.lastIndexOf('.'));
          return allowedExtensions.includes(ext);
        })
        .map(file => `${newFolderPath}/${file}`);

      // ランダムレイヤーを更新
      dispatch(updateRandomLayer({
        id: layerId,
        folderPath: newFolderPath,
        assets: assets,
      }));

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to change folder:', err);
      setIsLoading(false);
      alert('フォルダの変更に失敗しました');
    }
  }, [dispatch]);

  // 素材再読み込みハンドラー
  const handleRefreshAssets = useCallback(async (layerId, folderPath) => {
    if (!folderPath) return;

    try {
      setIsLoading(true);

      // フォルダ内のファイル一覧を取得
      const files = await window.api.fs.readDir(folderPath);
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const allowedExtensions = [...videoExtensions, ...imageExtensions];

      const assets = files
        .filter(file => {
          const ext = file.toLowerCase().slice(file.lastIndexOf('.'));
          return allowedExtensions.includes(ext);
        })
        .map(file => `${folderPath}/${file}`);

      // ランダムレイヤーを更新（シャッフルもリセットされる）
      dispatch(updateRandomLayer({
        id: layerId,
        assets: assets,
      }));

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh assets:', err);
      setIsLoading(false);
      alert('素材の再読み込みに失敗しました');
    }
  }, [dispatch]);

  // 名前編集開始
  const handleStartEditName = useCallback((layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  }, []);

  // 名前編集完了
  const handleFinishEditName = useCallback((layerId) => {
    if (editingName.trim()) {
      dispatch(updateRandomLayer({
        id: layerId,
        name: editingName.trim(),
      }));
    }
    setEditingId(null);
    setEditingName('');
  }, [dispatch, editingName]);

  // 削除ハンドラー
  const handleDelete = useCallback((layerId) => {
    const clipCount = clipCountByLayerId[layerId] || 0;
    if (clipCount > 0) {
      const confirmed = confirm(
        `このランダムレイヤーは ${clipCount} 個のクリップで使用されています。\n削除するとこれらのクリップが正しく動作しなくなる可能性があります。\n\n本当に削除しますか？`
      );
      if (!confirmed) return;
    }
    dispatch(deleteRandomLayer({ layerId }));
  }, [dispatch, clipCountByLayerId]);

  // シャッフルリセット
  const handleResetShuffle = useCallback((layerId) => {
    dispatch(resetLayerUsage({ layerId }));
  }, [dispatch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[600px] max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
          <h2 className="text-lg font-semibold text-ink-primary">ランダムレイヤー管理</h2>
          <IconButton
            icon={X}
            onClick={handleClose}
            size="sm"
            variant="ghost"
            aria-label="閉じる"
          />
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto flex-1">
          {randomLayers.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">
              <p className="mb-2">ランダムレイヤーがありません</p>
              <p className="text-xs">ランダムレイヤー一括配置でクリップを作成すると、ここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-3">
              {randomLayers.map((layer) => {
                const clipCount = clipCountByLayerId[layer.id] || 0;
                const isEditing = editingId === layer.id;

                return (
                  <div
                    key={layer.id}
                    className="p-3 rounded border border-line bg-surface-base"
                  >
                    {/* 名前とアクション */}
                    <div className="flex items-center justify-between mb-2">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleFinishEditName(layer.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishEditName(layer.id);
                            if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditingName('');
                            }
                          }}
                          autoFocus
                          className="text-sm font-medium"
                        />
                      ) : (
                        <span
                          className="text-sm font-medium text-ink-primary cursor-pointer hover:text-accent-blue"
                          onClick={() => handleStartEditName(layer)}
                          title="クリックして名前を編集"
                        >
                          {layer.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={RefreshCw}
                          onClick={() => handleRefreshAssets(layer.id, layer.folderPath)}
                          size="sm"
                          variant="ghost"
                          aria-label="素材を再読み込み"
                          title="素材を再読み込み"
                          disabled={isLoading}
                        />
                        <IconButton
                          icon={Trash2}
                          onClick={() => handleDelete(layer.id)}
                          size="sm"
                          variant="ghost"
                          aria-label="削除"
                          title="削除"
                          className="text-accent-red hover:bg-accent-red/10"
                        />
                      </div>
                    </div>

                    {/* フォルダパス */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 text-xs text-ink-muted truncate" title={layer.folderPath}>
                        {layer.folderPath || '(未設定)'}
                      </div>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => handleChangeFolder(layer.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1"
                      >
                        <Folder className="w-3 h-3" />
                        変更
                      </Button>
                    </div>

                    {/* 統計情報 */}
                    <div className="flex items-center gap-4 text-xs text-ink-muted">
                      <span>素材数: {layer.assets?.length || 0}</span>
                      <span>使用クリップ: {clipCount}</span>
                      <span className="text-ink-muted/50">
                        位置: {layer.currentIndex + 1}/{layer.assets?.length || 0}
                      </span>
                      <button
                        onClick={() => handleResetShuffle(layer.id)}
                        className="text-accent-blue hover:underline"
                        title="シャッフル順をリセット"
                      >
                        リセット
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-line flex-shrink-0">
          <div className="flex justify-between items-center">
            <p className="text-xs text-ink-muted">
              フォルダを変更すると、同じランダムレイヤーを参照する全クリップに即時反映されます
            </p>
            <Button variant="subtle" onClick={handleClose}>
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomLayerPanel;
