import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';
import { FontSelector, FontStyleControls } from '../FontSelector';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const TextLayerDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);

  // 設定状態
  const [textContent, setTextContent] = useState('テキストを入力');
  const [targetLayer, setTargetLayer] = useState('V1');
  const [clipDuration, setClipDuration] = useState(90); // フレーム
  const [startFrame, setStartFrame] = useState(0);
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Hiragino Sans');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#000000');
  const [fontWeight, setFontWeight] = useState(400);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#000000');

  // 現在位置を使用
  const handleUseCurrentPosition = () => {
    setStartFrame(currentFrame);
  };

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

  // 作成実行
  const handleCreate = useCallback(() => {
    const clipData = {
      id: generateId(),
      type: 'text',
      name: `テキスト: ${textContent.substring(0, 15)}${textContent.length > 15 ? '...' : ''}`,
      startFrame: startFrame,
      durationFrames: clipDuration,
      opacity: 100,
      // テキスト固有プロパティ
      textContent: textContent,
      fontSize: fontSize,
      fontFamily: fontFamily,
      textColor: textColor,
      bgColor: bgColor,
      fontWeight: fontWeight,
      isBold: isBold,
      isItalic: isItalic,
      strokeWidth: strokeWidth,
      strokeColor: strokeColor,
      animation: { type: 'none', duration_frames: 15 },
    };

    dispatch(addClip({ layerId: targetLayer, clip: clipData }));
    onClose();
  }, [dispatch, textContent, targetLayer, startFrame, clipDuration, fontSize, fontFamily, textColor, bgColor, fontWeight, isBold, isItalic, strokeWidth, strokeColor, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[440px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">テキストレイヤー作成</h2>
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
          {/* テキスト入力 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">テキスト内容</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary resize-none"
              placeholder="表示するテキストを入力"
            />
          </div>

          {/* プレビュー */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">プレビュー</label>
            <div
              className="p-4 rounded border border-line text-center"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                fontSize: `${Math.min(fontSize, 24)}px`,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : fontWeight,
                fontStyle: isItalic ? 'italic' : 'normal',
                WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : 'none',
              }}
            >
              {textContent || 'テキストを入力してください'}
            </div>
          </div>

          {/* フォント選択 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">フォント</label>
            <FontSelector
              value={fontFamily}
              onChange={setFontFamily}
              previewText={textContent || 'サンプル'}
            />
          </div>

          {/* フォントスタイル */}
          <FontStyleControls
            fontWeight={fontWeight}
            onFontWeightChange={setFontWeight}
            isBold={isBold}
            onBoldChange={setIsBold}
            isItalic={isItalic}
            onItalicChange={setIsItalic}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            previewText={textContent || 'サンプル'}
            fontFamily={fontFamily}
          />

          {/* スタイル設定 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">フォントサイズ</label>
              <Input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={200}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">文字色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">背景色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 bg-surface-sunken border border-line rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* 配置設定 */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="配置先レイヤー"
              value={targetLayer}
              onChange={(e) => setTargetLayer(e.target.value)}
              options={layerOptions}
            />
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
          </div>

          {/* 開始位置 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">開始フレーム</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={startFrame}
                onChange={(e) => setStartFrame(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="flex-1"
              />
              <Button variant="subtle" size="sm" onClick={handleUseCurrentPosition}>
                現在位置
              </Button>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-line">
          <Button variant="subtle" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!textContent.trim()}>
            作成
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TextLayerDialog;
