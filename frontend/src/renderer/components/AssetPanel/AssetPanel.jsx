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
const getAssetIcon = (type) => {
  switch (type) {
    case 'video': return '🎬';
    case 'image': return '🖼️';
    case 'audio': return '🎵';
    default: return '📄';
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
        ${isSelected ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}
        ${isDragging ? 'opacity-50' : ''}
        transition-colors
      `}
      onClick={() => onSelect(asset.id)}
    >
      <span className="text-lg">{getAssetIcon(asset.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{asset.name}</div>
        <div className="text-xs text-gray-400 capitalize">{asset.type}</div>
      </div>
      <button
        className="text-gray-400 hover:text-red-400 text-sm px-1"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(asset.id);
        }}
        title="削除"
      >
        ✕
      </button>
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
    { value: 'all', label: 'All' },
    { value: 'video', label: '🎬' },
    { value: 'image', label: '🖼️' },
    { value: 'audio', label: '🎵' },
  ];

  return (
    <div
      className={`h-full flex flex-col bg-gray-800 ${
        isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">Assets</h2>
          <button
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white"
            onClick={handleImportClick}
          >
            + Import
          </button>
        </div>

        {/* 検索 */}
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
        />

        {/* フィルター */}
        <div className="flex gap-1 mt-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              className={`px-2 py-1 text-xs rounded ${
                filter === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => dispatch(setFilter(btn.value))}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* アセットリスト */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-3xl mb-2">📁</div>
            <div>ファイルをドロップ</div>
            <div>または Import ボタン</div>
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

      {/* ドラッグオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-800 px-4 py-2 rounded-lg text-white text-sm">
            ファイルをドロップして追加
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetPanel;
