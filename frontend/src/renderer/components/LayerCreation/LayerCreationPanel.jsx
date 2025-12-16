import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, saveToHistory } from '../../store/timelineSlice';
import { addAssets } from '../../store/assetsSlice';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Video,
  Image,
  Folder,
  Type,
  Braces,
  Music,
  Volume2,
  Sliders,
} from '../Icons';
import VariableTextDialog from '../VariableText/VariableTextDialog';
import RandomLayerBulkDialog from './dialogs/RandomLayerBulkDialog';
import TextLayerDialog from './TextLayerDialog';
import AdjustmentLayerDialog from './AdjustmentLayerDialog';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

// カテゴリ設定
const categories = [
  {
    id: 'visual',
    name: '映像・画像',
    defaultOpen: true,
    types: [
      { type: 'video', label: '動画', icon: Video, description: '動画ファイルを追加', fileSelect: true, accept: 'video/*' },
      { type: 'image', label: '画像', icon: Image, description: '画像ファイルを追加', fileSelect: true, accept: 'image/*' },
      { type: 'randomVideo', label: 'ランダムビデオ', icon: Folder, description: 'フォルダから素材をランダム/順番に使用', dialog: 'randomLayerBulk' },
    ]
  },
  {
    id: 'text',
    name: 'テキスト',
    defaultOpen: true,
    types: [
      { type: 'text', label: 'テキスト', icon: Type, description: '固定テキストを追加', dialog: 'text' },
      { type: 'variableText', label: '可変テキスト', icon: Braces, description: '{{変数}}で動的テキスト', dialog: 'variableText' },
    ]
  },
  {
    id: 'audio',
    name: 'オーディオ',
    defaultOpen: true,
    types: [
      { type: 'bgm', label: 'BGM', icon: Music, description: '背景音楽を追加', fileSelect: true, accept: 'audio/*' },
      { type: 'se', label: '効果音', icon: Volume2, description: '効果音を追加', fileSelect: true, accept: 'audio/*' },
    ]
  },
  {
    id: 'effect',
    name: 'エフェクト',
    defaultOpen: true,
    types: [
      { type: 'adjustment', label: '調整レイヤー', icon: Sliders, description: '色調整・フィルターを適用', dialog: 'adjustment' },
    ]
  },
];

const LayerCreationPanel = () => {
  const dispatch = useDispatch();
  const currentFrame = useSelector((state) => state.timeline.currentFrame);

  // カテゴリの開閉状態
  const [openCategories, setOpenCategories] = useState(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.defaultOpen }), {})
  );

  // ダイアログ状態
  const [isVariableTextDialogOpen, setIsVariableTextDialogOpen] = useState(false);
  const [isRandomLayerBulkDialogOpen, setIsRandomLayerBulkDialogOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  // カテゴリの開閉をトグル
  const toggleCategory = useCallback((categoryId) => {
    setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  // レイヤータイプに応じた配置先を決定
  const getTargetLayer = useCallback((type) => {
    if (['bgm', 'se', 'audio'].includes(type)) {
      return type === 'bgm' ? 'S1' : 'S2';
    }
    return 'V1';
  }, []);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((layerType, accept) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      let currentFramePos = currentFrame;
      const targetLayer = getTargetLayer(layerType.type);

      dispatch(saveToHistory());

      files.forEach((file) => {
        // アセットとして追加
        const assetType = getAssetTypeFromFile(file.name);
        dispatch(addAssets([{
          name: file.name,
          type: assetType,
          path: file.path || URL.createObjectURL(file),
          duration: 90,
          thumbnail: null,
        }]));

        // クリップとして追加
        const clipData = {
          id: generateId(),
          type: layerType.type === 'se' ? 'se' : (layerType.type === 'bgm' ? 'bgm' : assetType),
          name: file.name,
          startFrame: currentFramePos,
          durationFrames: 90, // デフォルト3秒
          opacity: 100,
          sourcePath: file.path || URL.createObjectURL(file),
        };

        // タイプ別の追加プロパティ
        if (assetType === 'video' || assetType === 'image') {
          clipData.scale = 100;
          clipData.positionX = 0;
          clipData.positionY = 0;
          clipData.rotation = 0;
        }
        if (layerType.type === 'bgm' || layerType.type === 'se') {
          clipData.volume = 100;
          clipData.fade_in = { enabled: false, duration_sec: 0 };
          clipData.fade_out = { enabled: false, duration_sec: 0 };
        }

        dispatch(addClip({ layerId: targetLayer, clip: clipData }));
        currentFramePos += 90; // 次のクリップ用にフレームを進める
      });
    };
    input.click();
  }, [dispatch, currentFrame, getTargetLayer]);

  // レイヤー作成ハンドラー
  const handleCreateLayer = useCallback((layerType) => {
    if (layerType.fileSelect) {
      handleFileSelect(layerType, layerType.accept);
      return;
    }

    // ダイアログを開く
    switch (layerType.dialog) {
      case 'variableText':
        setIsVariableTextDialogOpen(true);
        break;
      case 'randomLayerBulk':
        setIsRandomLayerBulkDialogOpen(true);
        break;
      case 'text':
        setIsTextDialogOpen(true);
        break;
      case 'adjustment':
        setIsAdjustmentDialogOpen(true);
        break;
    }
  }, [handleFileSelect]);

  return (
    <div className="bg-surface-raised border-b border-line">
      {/* ヘッダー */}
      <div className="px-3 py-2 border-b border-line">
        <h3 className="text-sm font-medium text-ink-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新規レイヤー
        </h3>
      </div>

      {/* カテゴリ一覧 */}
      <div className="p-2">
        {categories.map((category) => (
          <div key={category.id} className="mb-2">
            {/* カテゴリヘッダー */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors"
            >
              {openCategories[category.id] ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
              {category.name}
            </button>

            {/* レイヤータイプグリッド */}
            {openCategories[category.id] && (
              <div className="grid grid-cols-3 gap-1 mt-1">
                {category.types.map((layerType) => (
                  <button
                    key={layerType.type}
                    onClick={() => handleCreateLayer(layerType)}
                    className="flex flex-col items-center p-2 rounded bg-surface-sunken hover:bg-state-hover border border-line transition-colors"
                    title={layerType.description}
                  >
                    <layerType.icon className="w-5 h-5 text-ink-secondary mb-1" />
                    <span className="text-[10px] text-ink-primary leading-tight text-center">
                      {layerType.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ヒント */}
        <div className="mt-2 p-2 bg-surface-sunken rounded text-[10px] text-ink-muted text-center border border-line">
          ファイルをタイムラインにD&Dでも追加可
        </div>
      </div>

      {/* ダイアログ */}
      <VariableTextDialog
        isOpen={isVariableTextDialogOpen}
        onClose={() => setIsVariableTextDialogOpen(false)}
      />
      <RandomLayerBulkDialog
        isOpen={isRandomLayerBulkDialogOpen}
        onClose={() => setIsRandomLayerBulkDialogOpen(false)}
      />
      <TextLayerDialog
        isOpen={isTextDialogOpen}
        onClose={() => setIsTextDialogOpen(false)}
      />
      <AdjustmentLayerDialog
        isOpen={isAdjustmentDialogOpen}
        onClose={() => setIsAdjustmentDialogOpen(false)}
      />
    </div>
  );
};

export default LayerCreationPanel;
