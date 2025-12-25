import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClip, updateClip, selectLayerOrder, selectLayers, selectResolution, selectSelectedClipIds, saveToHistory } from '../../store/timelineSlice';
import { Button, IconButton, Input, Select } from '../ui';
import { X } from '../Icons';

const generateId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// プリセット定義
const PRESETS = {
  // 縦キャンバスに横動画3本を上・中・下に並べる
  verticalTriple: {
    name: '縦キャンバス・横3本レイアウト',
    description: '縦長キャンバスに横動画を上・中・下に配置',
    apply: (clips, resolution, fps) => {
      const canvasHeight = resolution?.height || 1920;
      const sectionHeight = canvasHeight / 3;

      // 上・中・下のY位置（中心基準）
      const positions = [
        -sectionHeight, // 上
        0,              // 中
        sectionHeight,  // 下
      ];

      // プレビューカラー
      const colors = ['#EF4444', '#22C55E', '#3B82F6'];

      return clips.slice(0, 3).map((clip, index) => ({
        ...clip,
        positionX: 0,
        positionY: positions[index] || 0,
        scale: 33, // 1/3スケール
        fit: 'contain',
        previewColor: colors[index] || '#FFFFFF',
      }));
    },
  },

  // 2フレーム刻みスライドイン連番
  slideInSequence: {
    name: 'スライドイン連番（2フレーム刻み）',
    description: '上・右・下から順にスライドイン',
    apply: (clips, resolution, fps) => {
      const transitionTypes = ['slide_from_top', 'slide_from_right', 'slide_from_bottom'];
      const colors = ['#EF4444', '#22C55E', '#3B82F6'];
      const frameOffset = 2;
      const durationFrames = 6;

      return clips.map((clip, index) => ({
        ...clip,
        startFrame: index * frameOffset,
        durationFrames: durationFrames,
        transition_in: {
          type: transitionTypes[index % 3],
          duration_frames: 2,
          easing: 'ease_out',
        },
        previewColor: colors[index % 3],
      }));
    },
  },

  // 縦3本 + スライドイン連番の組み合わせ
  verticalTripleSlideIn: {
    name: '縦3本 + スライドイン',
    description: '縦3本レイアウト + 2フレーム刻みスライドイン',
    apply: (clips, resolution, fps) => {
      const canvasHeight = resolution?.height || 1920;
      const sectionHeight = canvasHeight / 3;

      const positions = [-sectionHeight, 0, sectionHeight];
      const transitionTypes = ['slide_from_top', 'slide_from_right', 'slide_from_bottom'];
      const colors = ['#EF4444', '#22C55E', '#3B82F6'];
      const frameOffset = 2;
      const durationFrames = 6;

      return clips.slice(0, 3).map((clip, index) => ({
        ...clip,
        positionX: 0,
        positionY: positions[index] || 0,
        scale: 33,
        fit: 'contain',
        startFrame: index * frameOffset,
        durationFrames: durationFrames,
        transition_in: {
          type: transitionTypes[index],
          duration_frames: 2,
          easing: 'ease_out',
        },
        previewColor: colors[index],
      }));
    },
  },
};

const BulkPlacementDialog = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const layerOrder = useSelector(selectLayerOrder);
  const layers = useSelector(selectLayers);
  const resolution = useSelector(selectResolution);
  const selectedClipIds = useSelector(selectSelectedClipIds);
  const fps = useSelector((state) => state.timeline.fps) || 24;

  // モード: 'create' = 新規作成, 'apply' = 既存に適用
  const [mode, setMode] = useState('create');
  const [selectedPreset, setSelectedPreset] = useState('');

  // 新規作成モード用
  const [clipType, setClipType] = useState('random_layer');
  const [targetLayer, setTargetLayer] = useState('V1');
  const [clipCount, setClipCount] = useState(3);
  const [clipDuration, setClipDuration] = useState(60);
  const [startFrame, setStartFrame] = useState(0);
  const [gap, setGap] = useState(0);
  const [folderPath, setFolderPath] = useState('');

  // クリップタイプの選択肢
  const clipTypeOptions = useMemo(() => [
    { value: 'random_layer', label: 'ランダムレイヤー' },
    { value: 'variable_text', label: '可変テキスト' },
    { value: 'video', label: '動画' },
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

  // プリセット選択肢
  const presetOptions = useMemo(() => [
    { value: '', label: 'プリセットを選択...' },
    ...Object.entries(PRESETS).map(([key, preset]) => ({
      value: key,
      label: preset.name,
    })),
  ], []);

  // 選択中のクリップを取得
  const getSelectedClips = useCallback(() => {
    const clips = [];
    Object.entries(layers).forEach(([layerId, layer]) => {
      layer.clips.forEach(clip => {
        if (selectedClipIds.includes(clip.id)) {
          clips.push({ ...clip, layerId });
        }
      });
    });
    return clips;
  }, [layers, selectedClipIds]);

  // 新規作成実行
  const handleCreate = useCallback(() => {
    // random_layerはネスト型コンテナとして1本にまとめる
    if (clipType === 'random_layer') {
      const segments = [];
      let currentOffset = 0;
      for (let i = 0; i < clipCount; i++) {
        segments.push({
          id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startOffset: currentOffset,
          duration: clipDuration,
          randomLayerId: null,
          assetId: null,
          fit: null,
          audioGain: 1.0,
          speed: 1.0,
        });
        currentOffset += clipDuration + gap;
      }

      const totalDuration = currentOffset - gap; // 最後のギャップは外す

      const clipData = {
        id: generateId(),
        type: 'random_layer',
        name: `${clipTypeOptions.find(t => t.value === clipType)?.label || clipType} コンテナ`,
        startFrame,
        durationFrames: totalDuration,
        opacity: 100,
        scale: 100,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        fit: 'contain',
        folderPath: folderPath,
        selectionMode: 'random',
        extensions: '.mp4,.mov,.avi',
        fileLimit: 0,
        envelope: {
          in: { type: 'none', duration_frames: 6, easing: 'ease_in_out' },
          out: { type: 'none', duration_frames: 6, easing: 'ease_in_out' },
        },
        segments,
      };

      dispatch(saveToHistory());
      dispatch(addClip({ layerId: targetLayer, clip: clipData }));
      onClose();
      return;
    }

    let currentFramePos = startFrame;
    const newClips = [];

    for (let i = 0; i < clipCount; i++) {
      const clipData = {
        id: generateId(),
        type: clipType,
        name: `${clipTypeOptions.find(t => t.value === clipType)?.label || clipType} ${i + 1}`,
        startFrame: currentFramePos,
        durationFrames: clipDuration,
        opacity: 100,
        scale: 100,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        fit: 'contain',
      };

      newClips.push(clipData);
      currentFramePos += clipDuration + gap;
    }

    // プリセットが選択されていれば適用
    let finalClips = newClips;
    if (selectedPreset && PRESETS[selectedPreset]) {
      finalClips = PRESETS[selectedPreset].apply(newClips, resolution, fps);
    }

    // 履歴に保存
    dispatch(saveToHistory());

    // クリップを追加
    finalClips.forEach(clip => {
      dispatch(addClip({ layerId: targetLayer, clip }));
    });

    onClose();
  }, [dispatch, clipType, targetLayer, clipCount, clipDuration, startFrame, gap, folderPath, selectedPreset, resolution, fps, onClose, clipTypeOptions]);

  // 既存クリップにプリセット適用
  const handleApplyPreset = useCallback(() => {
    if (!selectedPreset || !PRESETS[selectedPreset]) {
      alert('プリセットを選択してください');
      return;
    }

    const selectedClips = getSelectedClips();
    if (selectedClips.length === 0) {
      alert('クリップを選択してください');
      return;
    }

    // random_layerのみフィルタ
    const randomLayerClips = selectedClips.filter(c => c.type === 'random_layer');
    if (randomLayerClips.length === 0) {
      alert('ランダムレイヤーを選択してください');
      return;
    }

    const updatedClips = PRESETS[selectedPreset].apply(randomLayerClips, resolution, fps);

    dispatch(saveToHistory());

    updatedClips.forEach((updatedClip, index) => {
      const originalClip = randomLayerClips[index];
      if (originalClip) {
        dispatch(updateClip({
          layerId: originalClip.layerId,
          clipId: originalClip.id,
          updates: {
            positionX: updatedClip.positionX,
            positionY: updatedClip.positionY,
            scale: updatedClip.scale,
            fit: updatedClip.fit,
            startFrame: updatedClip.startFrame,
            durationFrames: updatedClip.durationFrames,
            transition_in: updatedClip.transition_in,
            previewColor: updatedClip.previewColor,
          },
        }));
      }
    });

    onClose();
  }, [dispatch, selectedPreset, getSelectedClips, resolution, fps, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-line rounded-lg shadow-lg w-[520px] max-h-[85vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink-primary">一括配置 / エフェクト適用</h2>
          <IconButton
            icon={X}
            onClick={onClose}
            size="sm"
            variant="ghost"
            aria-label="閉じる"
          />
        </div>

        {/* モード切替タブ */}
        <div className="flex border-b border-line">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'text-accent-blue border-b-2 border-accent-blue bg-surface-raised'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            新規作成
          </button>
          <button
            onClick={() => setMode('apply')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'apply'
                ? 'text-accent-blue border-b-2 border-accent-blue bg-surface-raised'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            選択クリップに適用
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* プリセット選択 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">プリセット</label>
            <Select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              options={presetOptions}
            />
            {selectedPreset && PRESETS[selectedPreset] && (
              <p className="text-xs text-ink-muted mt-1">
                {PRESETS[selectedPreset].description}
              </p>
            )}
          </div>

          {mode === 'create' && (
            <>
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
                  {(clipDuration / fps).toFixed(2)}秒 @ {fps}fps
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

              {/* プレビュー情報 */}
              <div className="p-3 bg-surface-sunken rounded border border-line">
                <h3 className="text-sm font-medium text-ink-secondary mb-2">配置プレビュー</h3>
                <div className="text-xs text-ink-muted space-y-1">
                  <div>総クリップ数: {clipCount}</div>
                  <div>配置範囲: {startFrame}〜{startFrame + (clipCount * (clipDuration + gap)) - gap}フレーム</div>
                  <div>総時間: {((clipCount * (clipDuration + gap) - gap) / fps).toFixed(2)}秒</div>
                  {selectedPreset && <div className="text-accent-blue">+ プリセット「{PRESETS[selectedPreset]?.name}」を適用</div>}
                </div>
              </div>
            </>
          )}

          {mode === 'apply' && (
            <>
              {/* 選択中のクリップ情報 */}
              <div className="p-3 bg-surface-sunken rounded border border-line">
                <h3 className="text-sm font-medium text-ink-secondary mb-2">選択中のクリップ</h3>
                <div className="text-xs text-ink-muted">
                  {selectedClipIds.length === 0 ? (
                    <p>クリップを選択してください（タイムラインでクリック）</p>
                  ) : (
                    <>
                      <p>{selectedClipIds.length}個のクリップを選択中</p>
                      <p className="mt-1">ランダムレイヤー: {getSelectedClips().filter(c => c.type === 'random_layer').length}個</p>
                    </>
                  )}
                </div>
              </div>

              {/* 適用される設定のプレビュー */}
              {selectedPreset && PRESETS[selectedPreset] && (
                <div className="p-3 bg-accent-blue/10 rounded border border-accent-blue/30">
                  <h3 className="text-sm font-medium text-accent-blue mb-2">適用される設定</h3>
                  <div className="text-xs text-ink-secondary space-y-1">
                    {selectedPreset === 'verticalTriple' && (
                      <>
                        <div>• 上段: Y=-{Math.round((resolution?.height || 1920) / 3)}px</div>
                        <div>• 中段: Y=0px</div>
                        <div>• 下段: Y=+{Math.round((resolution?.height || 1920) / 3)}px</div>
                        <div>• スケール: 33%、フィット: contain</div>
                      </>
                    )}
                    {selectedPreset === 'slideInSequence' && (
                      <>
                        <div>• 1番目: 0フレーム目、上からスライドイン</div>
                        <div>• 2番目: 2フレーム目、右からスライドイン</div>
                        <div>• 3番目: 4フレーム目、下からスライドイン</div>
                        <div>• 各6フレーム表示</div>
                      </>
                    )}
                    {selectedPreset === 'verticalTripleSlideIn' && (
                      <>
                        <div>• 縦3本レイアウト + スライドイン</div>
                        <div>• 2フレーム刻みで順次表示</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-line">
          <Button variant="subtle" onClick={onClose}>
            キャンセル
          </Button>
          {mode === 'create' ? (
            <Button variant="primary" onClick={handleCreate}>
              作成
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApplyPreset}
              disabled={!selectedPreset || selectedClipIds.length === 0}
            >
              プリセットを適用
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkPlacementDialog;
