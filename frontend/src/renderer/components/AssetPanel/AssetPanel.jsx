import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDrag } from 'react-dnd';
import {
  selectFilteredAssets,
  selectFilter,
  selectSearchQuery,
  selectSelectedAssetId,
  addAssets,
  removeAsset,
  selectAsset,
  setFilter,
  setSearchQuery,
} from '../../store/assetsSlice';
import { Film, Image, Music, File, X, Plus, FolderOpen } from '../Icons';
import { Button, IconButton, Input } from '../ui';
import LayerCreationPanel from '../LayerCreation/LayerCreationPanel';

// ドラッグ用アイテムタイプ
export const AssetItemTypes = {
  ASSET: 'asset',
};

// ファイル拡張子からタイプを判定
const getAssetTypeFromFile = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];

  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  if (audioExts.includes(ext)) return 'audio';
  return 'video';
};

// アイコン取得
const AssetIcon = ({ type, className = "w-4 h-4" }) => {
  switch (type) {
    case 'video': return <Film className={className} />;
    case 'image': return <Image className={className} />;
    case 'audio': return <Music className={className} />;
    default: return <File className={className} />;
  }
};

// 個別アセットアイテム
function AssetItem({ asset, isSelected, onSelect, onRemove }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: AssetItemTypes.ASSET,
    item: {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      path: asset.path,
      duration: asset.duration || 90,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [asset]);

  return (
    <div
      ref={drag}
      className={`
        p-2 rounded cursor-grab active:cursor-grabbing
        flex items-center gap-2
        ${isSelected ? 'bg-accent-blue' : 'bg-surface-highest hover:bg-state-hover'}
        ${isDragging ? 'opacity-50' : ''}
        transition-colors
      `}
      onClick={() => onSelect(asset.id)}
    >
      <span className="text-ink-secondary"><AssetIcon type={asset.type} className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{asset.name}</div>
        <div className="text-xs text-ink-muted capitalize">{asset.type}</div>
      </div>
      <IconButton
        variant="ghost"
        size="sm"
        className="text-ink-muted hover:text-accent-red"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(asset.id);
        }}
        title="削除"
      >
        <X className="w-4 h-4" />
      </IconButton>
    </div>
  );
}

// メインコンポーネント
function AssetPanel() {
  const dispatch = useDispatch();
  const assets = useSelector(selectFilteredAssets);
  const filter = useSelector(selectFilter);
  const searchQuery = useSelector(selectSearchQuery);
  const selectedAssetId = useSelector(selectSelectedAssetId);
  const [isDragOver, setIsDragOver] = useState(false);

  // ファイルドロップハンドラー
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const newAssets = files.map((file) => ({
      name: file.name,
      type: getAssetTypeFromFile(file.name),
      path: file.path,
      duration: 90, // デフォルト3秒
      thumbnail: null,
    }));

    dispatch(addAssets(newAssets));
  }, [dispatch]);

  // ファイル選択ダイアログ
  const handleImportClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'video/*,image/*,audio/*';
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const newAssets = files.map((file) => ({
        name: file.name,
        type: getAssetTypeFromFile(file.name),
        path: file.path || URL.createObjectURL(file),
        duration: 90,
        thumbnail: null,
      }));

      dispatch(addAssets(newAssets));
    };
    input.click();
  }, [dispatch]);

  const handleSelect = useCallback((id) => {
    dispatch(selectAsset(id));
  }, [dispatch]);

  const handleRemove = useCallback((id) => {
    dispatch(removeAsset(id));
  }, [dispatch]);

  const filterButtons = [
    { value: 'all', label: 'すべて', icon: null },
    { value: 'video', label: null, icon: Film },
    { value: 'image', label: null, icon: Image },
    { value: 'audio', label: null, icon: Music },
  ];

  return (
    <div
      className={`h-full flex flex-col bg-surface-raised ${
        isDragOver ? 'ring-2 ring-accent-blue ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 新規レイヤー作成パネル */}
      <LayerCreationPanel />

      {/* アセット管理セクション */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* ヘッダー */}
        <div className="p-3 border-b border-line">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-ink-secondary">素材ライブラリ</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={handleImportClick}
            >
              <Plus className="w-3 h-3" />
              インポート
            </Button>
          </div>

          {/* 検索 */}
          <Input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full"
          />

          {/* フィルター */}
          <div className="flex gap-1 mt-2">
            {filterButtons.map((btn) => {
              const isActive = filter === btn.value;
              if (btn.icon) {
                return (
                  <IconButton
                    key={btn.value}
                    variant={isActive ? 'subtle' : 'ghost'}
                    size="sm"
                    className={isActive ? 'bg-accent-blue text-white hover:bg-accent-blue' : ''}
                    onClick={() => dispatch(setFilter(btn.value))}
                  >
                    <btn.icon className="w-4 h-4" />
                  </IconButton>
                );
              }
              return (
                <Button
                  key={btn.value}
                  variant={isActive ? 'primary' : 'subtle'}
                  size="sm"
                  onClick={() => dispatch(setFilter(btn.value))}
                >
                  {btn.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* アセットリスト */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {assets.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">
              <FolderOpen className="w-8 h-8 mx-auto mb-2" />
              <div>ファイルをドロップ</div>
              <div>または インポート ボタン</div>
            </div>
          ) : (
            assets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                isSelected={asset.id === selectedAssetId}
                onSelect={handleSelect}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </div>

      {/* ドラッグオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 bg-accent-blue/20 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-raised px-4 py-2 rounded-lg text-ink-primary text-sm">
            ファイルをドロップして追加
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetPanel;
