import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const BulkPlacementDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);

  // 設定状態
  const [clipType, setClipType] = useState('random_layer');
  const [targetLayer, setTargetLayer] = useState('V1');
  const [clipCount, setClipCount] = useState(5);
  const [clipDuration, setClipDuration] = useState(60); // フレーム
  const [startFrame, setStartFrame] = useState(0);
  const [gap, setGap] = useState(0); // クリップ間のギャップ（フレーム）
  const [folderPath, setFolderPath] = useState('');
  const [csvPath, setCsvPath] = useState('');

  // クリップタイプの選択肢
  const clipTypeOptions = useMemo(() => [
    { value: 'random_layer', label: 'ランダムレイヤー' },
    { value: 'variable_text', label: '可変テキスト' },
    { value: 'adjustment', label: '調整レイヤー' },
    { value: 'video', label: '動画' },
    { value: 'text', label: 'テキスト' },
  ], []);

  // ビデオレイヤーのみ抽出
  const layerOptions = useMemo(() =>
    layerOrder
      .filter(id => id.startsWith('V'))
      .map(layerId => ({
        value: layerId,
        label: layers[layerId]?.name || layerId
      })),
    [layerOrder, layers]
  );

  // 一括配置実行
  const handleBulkPlace = useCallback(() => {
    let currentFrame = startFrame;

    for (let i = 0; i < clipCount; i++) {
      const clipData = {
        id: generateId(),
        type: clipType,
        name: `${clipTypeOptions.find(t => t.value === clipType)?.label || clipType} ${i + 1}`,
        startFrame: currentFrame,
        durationFrames: clipDuration,
        opacity: 100,
      };

      // クリップタイプ別の追加プロパティ
      if (clipType === 'random_layer') {
        clipData.folderPath = folderPath;
        clipData.selectionMode = 'random';
        clipData.extensions = '.mp4,.mov,.avi';
        clipData.fileLimit = 0;
      } else if (clipType === 'variable_text') {
        clipData.csvPath = csvPath;
        clipData.columnName = 'text';
        clipData.fontSize = 48;
        clipData.textColor = '#ffffff';
        clipData.bgColor = '#000000';
      } else if (clipType === 'adjustment') {
        clipData.brightness = 100;
        clipData.contrast = 100;
        clipData.saturation = 100;
        clipData.blur = 0;
        clipData.temperature = 0;
        clipData.vignette = 0;
      } else if (clipType === 'video') {
        clipData.scale = 100;
        clipData.positionX = 0;
        clipData.positionY = 0;
        clipData.rotation = 0;
      } else if (clipType === 'text') {
        clipData.textContent = `テキスト ${i + 1}`;
        clipData.fontSize = 48;
        clipData.textColor = '#ffffff';
        clipData.bgColor = '#000000';
      }

      dispatch(addClip({ layerId: targetLayer, clip: clipData }));

      currentFrame += clipDuration + gap;
    }

    onClose();
  }, [dispatch, clipType, targetLayer, clipCount, clipDuration, startFrame, gap, folderPath, csvPath, onClose, clipTypeOptions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[480px] max-h-[80vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">一括配置</h2>
          <IconButton
            icon={X}
            onClick={onClose}
            size="sm"
            variant="ghost"
            aria-label="閉じる"
          />
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* クリップタイプ */}
          <Select
            label="クリップタイプ"
            value={clipType}
            onChange={(e) => setClipType(e.target.value)}
            options={clipTypeOptions}
          />

          {/* 配置先レイヤー */}
          <Select
            label="配置先レイヤー"
            value={targetLayer}
            onChange={(e) => setTargetLayer(e.target.value)}
            options={layerOptions}
          />

          {/* クリップ数 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">クリップ数</label>
            <Input
              type="number"
              value={clipCount}
              onChange={(e) => setClipCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={100}
            />
          </div>

          {/* クリップの長さ */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">クリップの長さ（フレーム）</label>
            <Input
              type="number"
              value={clipDuration}
              onChange={(e) => setClipDuration(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
            <span className="text-xs text-ink-muted">
              {(clipDuration / 30).toFixed(2)}秒 @ 30fps
            </span>
          </div>

          {/* 開始フレーム */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">開始フレーム</label>
            <Input
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
            />
          </div>

          {/* ギャップ */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">クリップ間のギャップ（フレーム）</label>
            <Input
              type="number"
              value={gap}
              onChange={(e) => setGap(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
            />
          </div>

          {/* ランダムレイヤー用: フォルダパス */}
          {clipType === 'random_layer' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">動画フォルダパス</label>
              <Input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/path/to/videos"
              />
            </div>
          )}

          {/* 可変テキスト用: CSVパス */}
          {clipType === 'variable_text' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">CSVファイルパス</label>
              <Input
                type="text"
                value={csvPath}
                onChange={(e) => setCsvPath(e.target.value)}
                placeholder="/path/to/data.csv"
              />
            </div>
          )}

          {/* プレビュー情報 */}
          <div className="p-3 bg-surface-sunken rounded border border-line">
            <h3 className="text-sm font-medium text-ink-secondary mb-2">配置プレビュー</h3>
            <div className="text-xs text-ink-muted space-y-1">
              <div>総クリップ数: {clipCount}</div>
              <div>配置範囲: {startFrame}〜{startFrame + (clipCount * (clipDuration + gap)) - gap}フレーム</div>
              <div>総時間: {((clipCount * (clipDuration + gap) - gap) / 30).toFixed(2)}秒</div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-line">
          <Button variant="subtle" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleBulkPlace}>
            配置実行
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkPlacementDialog;
