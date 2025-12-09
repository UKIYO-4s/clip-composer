import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  initializeProject,
  setShowNewProjectDialog,
  selectShowNewProjectDialog,
} from '../../store/timelineSlice';
import { Button, Input, Select } from '../ui';

// 解像度プリセット
const resolutionPresets = [
  { value: '1080x1920', label: '縦 1080×1920 (TikTok/Reels)', width: 1080, height: 1920 },
  { value: '720x1280', label: '縦 720×1280', width: 720, height: 1280 },
  { value: '1080x1080', label: '正方形 1080×1080', width: 1080, height: 1080 },
  { value: '1920x1080', label: '横 1920×1080 (YouTube)', width: 1920, height: 1080 },
  { value: '1280x720', label: '横 1280×720', width: 1280, height: 720 },
  { value: 'custom', label: 'カスタム', width: 0, height: 0 },
];

// 尺プリセット（秒）
const durationPresets = [
  { value: 15, label: '15秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '60秒 (1分)' },
  { value: 90, label: '90秒' },
  { value: 180, label: '180秒 (3分)' },
  { value: 'custom', label: 'カスタム' },
];

function NewProjectDialog() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectShowNewProjectDialog);

  const [resolutionPreset, setResolutionPreset] = useState('1080x1920');
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1920);
  const [durationPreset, setDurationPreset] = useState(30);
  const [customDuration, setCustomDuration] = useState(30);
  const [fps, setFps] = useState(30);

  if (!isOpen) return null;

  const handleCreate = () => {
    // 解像度の取得
    let width, height;
    if (resolutionPreset === 'custom') {
      width = customWidth;
      height = customHeight;
    } else {
      const preset = resolutionPresets.find(p => p.value === resolutionPreset);
      width = preset.width;
      height = preset.height;
    }

    // 尺の取得
    const duration = durationPreset === 'custom' ? customDuration : durationPreset;
    const totalFrames = duration * fps;

    dispatch(initializeProject({
      resolution: { width, height },
      totalFrames,
      fps,
    }));
  };

  const handleSkip = () => {
    // デフォルト値で続行（ダイアログを閉じるだけ）
    dispatch(setShowNewProjectDialog(false));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface-raised shadow-xl">
        {/* ヘッダー */}
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-semibold text-white">新規プロジェクト</h2>
          <p className="text-sm text-ink-muted mt-1">プロジェクトの設定を選択してください</p>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* 解像度 */}
          <div>
            <label className="block text-sm text-ink-secondary mb-2">解像度</label>
            <Select
              value={resolutionPreset}
              onChange={(e) => setResolutionPreset(e.target.value)}
              options={resolutionPresets.map(p => ({ value: p.value, label: p.label }))}
              className="w-full"
            />
          </div>

          {/* カスタム解像度 */}
          {resolutionPreset === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-ink-muted mb-1">幅</label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-ink-muted mb-1">高さ</label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
            </div>
          )}

          {/* 尺 */}
          <div>
            <label className="block text-sm text-ink-secondary mb-2">動画の長さ</label>
            <Select
              value={durationPreset}
              onChange={(e) => {
                const val = e.target.value;
                setDurationPreset(val === 'custom' ? 'custom' : parseInt(val));
              }}
              options={durationPresets.map(p => ({ value: p.value, label: p.label }))}
              className="w-full"
            />
          </div>

          {/* カスタム尺 */}
          {durationPreset === 'custom' && (
            <div>
              <label className="block text-xs text-ink-muted mb-1">秒数</label>
              <Input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                min={1}
                max={600}
              />
            </div>
          )}

          {/* FPS */}
          <div>
            <label className="block text-sm text-ink-secondary mb-2">フレームレート</label>
            <Select
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              options={[
                { value: 30, label: '30 fps' },
                { value: 60, label: '60 fps' },
                { value: 24, label: '24 fps' },
              ]}
              className="w-full"
            />
          </div>

          {/* プレビュー情報 */}
          <div className="p-3 rounded bg-surface-sunken border border-line">
            <div className="text-xs text-ink-muted space-y-1">
              <div className="flex justify-between">
                <span>解像度:</span>
                <span className="text-ink-secondary">
                  {resolutionPreset === 'custom'
                    ? `${customWidth}×${customHeight}`
                    : resolutionPresets.find(p => p.value === resolutionPreset)?.label.split(' ')[1]
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>尺:</span>
                <span className="text-ink-secondary">
                  {durationPreset === 'custom' ? customDuration : durationPreset}秒
                </span>
              </div>
              <div className="flex justify-between">
                <span>総フレーム数:</span>
                <span className="text-ink-secondary">
                  {(durationPreset === 'custom' ? customDuration : durationPreset) * fps} frames
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-between border-t border-line p-4">
          <Button
            variant="ghost"
            size="md"
            onClick={handleSkip}
          >
            スキップ
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreate}
          >
            作成
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewProjectDialog;
