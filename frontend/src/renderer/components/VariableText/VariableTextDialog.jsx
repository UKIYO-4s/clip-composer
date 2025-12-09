import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, selectLayerOrder, selectLayers } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';
import { FontSelector, FontStyleControls } from '../FontSelector';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// テンプレートから変数を抽出
const extractVariables = (template) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
};

// テンプレートをプレビュー用にレンダリング
const renderPreview = (template, values) => {
  let result = template;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
  });
  return result;
};

const VariableTextDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const currentFrame = useSelector((state) => state.timeline.currentFrame);

  // モード切り替え
  const [mode, setMode] = useState('template'); // 'template' | 'csv_placeholder'

  // 設定状態
  const [template, setTemplate] = useState('{{商品名}}が今なら{{割引率}}OFF!');
  const [variableValues, setVariableValues] = useState({});
  const [csvColumnName, setCsvColumnName] = useState(''); // CSV列名
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
  const [strokePosition, setStrokePosition] = useState('center');
  const [blendMode, setBlendMode] = useState('normal');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textOpacity, setTextOpacity] = useState(100);

  // テンプレートから変数を抽出
  const variables = useMemo(() => extractVariables(template), [template]);

  // プレビューテキスト
  const previewText = useMemo(() => renderPreview(template, variableValues), [template, variableValues]);

  // 変数値の更新
  const handleVariableChange = (varName, value) => {
    setVariableValues((prev) => ({ ...prev, [varName]: value }));
  };

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
    let clipData;

    if (mode === 'template') {
      clipData = {
        id: generateId(),
        type: 'variable_text',
        name: `可変テキスト: ${template.substring(0, 20)}...`,
        startFrame: startFrame,
        durationFrames: clipDuration,
        opacity: 100,
        // 可変テキスト固有プロパティ
        template: template,
        variables: variables,
        variableValues: variableValues,
        fontSize: fontSize,
        fontFamily: fontFamily,
        textColor: textColor,
        bgColor: bgColor,
        fontWeight: fontWeight,
        isBold: isBold,
        isItalic: isItalic,
        strokeWidth: strokeWidth,
        strokeColor: strokeColor,
        strokePosition: strokePosition,
        blendMode: blendMode,
        letterSpacing: letterSpacing,
        textOpacity: textOpacity,
      };
    } else {
      clipData = {
        id: generateId(),
        type: 'csv_text_placeholder',
        name: `CSVテキスト: ${csvColumnName}`,
        startFrame: startFrame,
        durationFrames: clipDuration,
        opacity: 100,
        // CSVプレースホルダー固有プロパティ
        csvColumnName: csvColumnName,
        fontSize: fontSize,
        fontFamily: fontFamily,
        textColor: textColor,
        bgColor: bgColor,
        fontWeight: fontWeight,
        isBold: isBold,
        isItalic: isItalic,
        strokeWidth: strokeWidth,
        strokeColor: strokeColor,
        strokePosition: strokePosition,
        blendMode: blendMode,
        letterSpacing: letterSpacing,
        textOpacity: textOpacity,
      };
    }

    dispatch(addClip({ layerId: targetLayer, clip: clipData }));
    onClose();
  }, [mode, dispatch, template, variables, variableValues, csvColumnName, targetLayer, startFrame, clipDuration, fontSize, fontFamily, textColor, bgColor, fontWeight, isBold, isItalic, strokeWidth, strokeColor, strokePosition, blendMode, letterSpacing, textOpacity, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[520px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">可変テキストレイヤー作成</h2>
          <IconButton
            icon={X}
            onClick={onClose}
            size="sm"
            variant="ghost"
            aria-label="閉じる"
          />
        </div>

        {/* モード切り替えタブ */}
        <div className="flex border-b border-line">
          <button
            className={`flex-1 py-2 text-sm font-medium ${mode === 'template' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-ink-secondary'}`}
            onClick={() => setMode('template')}
          >
            テンプレート
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${mode === 'csv_placeholder' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-ink-secondary'}`}
            onClick={() => setMode('csv_placeholder')}
          >
            CSVプレースホルダー
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {mode === 'template' ? (
            <>
              {/* テンプレート入力 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary">
                  テンプレート <span className="text-ink-muted">（{'{{変数名}}'} の形式で変数を使用）</span>
                </label>
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary resize-none"
                  placeholder="{{商品名}}が今なら{{割引率}}OFF!"
                />
              </div>

              {/* 変数一覧 */}
              {variables.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-secondary">変数一覧（プレビュー用）</label>
                  <div className="p-3 bg-surface-sunken rounded border border-line space-y-2">
                    {variables.map((varName) => (
                      <div key={varName} className="flex items-center gap-2">
                        <span className="text-sm text-ink-muted w-24 truncate" title={varName}>
                          {'{{'}{varName}{'}}'}:
                        </span>
                        <Input
                          type="text"
                          value={variableValues[varName] || ''}
                          onChange={(e) => handleVariableChange(varName, e.target.value)}
                          placeholder={`${varName}の値`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    paintOrder: strokePosition === 'outside' ? 'stroke fill' : 'fill stroke',
                    letterSpacing: `${letterSpacing}px`,
                    opacity: textOpacity / 100,
                    mixBlendMode: blendMode,
                  }}
                >
                  {previewText || 'テンプレートを入力してください'}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* CSV列名入力 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary">CSV列名</label>
                <Input
                  type="text"
                  value={csvColumnName}
                  onChange={(e) => setCsvColumnName(e.target.value)}
                  placeholder="商品名"
                />
              </div>
            </>
          )}

          {/* フォント選択 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">フォント</label>
            <FontSelector
              value={fontFamily}
              onChange={setFontFamily}
              previewText={mode === 'template' ? (previewText || 'サンプル') : (csvColumnName || 'サンプル')}
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
            strokePosition={strokePosition}
            onStrokePositionChange={setStrokePosition}
            blendMode={blendMode}
            onBlendModeChange={setBlendMode}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={setLetterSpacing}
            textOpacity={textOpacity}
            onTextOpacityChange={setTextOpacity}
            previewText={mode === 'template' ? (previewText || 'サンプル') : (csvColumnName || 'サンプル')}
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
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={mode === 'template' ? !template.trim() : !csvColumnName.trim()}
          >
            作成
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VariableTextDialog;
