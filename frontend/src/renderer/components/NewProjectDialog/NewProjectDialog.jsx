import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  initializeProject,
  setShowNewProjectDialog,
  selectShowNewProjectDialog,
} from '../../store/timelineSlice';
import { clearAssets } from '../../store/assetsSlice';
import { newProject } from '../../store/projectSlice';
import { Button, Input, Select } from '../ui';
import { FilePlus, FolderOpen } from '../Icons';

// 解像度プリセット
const resolutionPresets = [
  { value: '1080x1920', label: '縦 1080×1920 (TikTok/Reels)', width: 1080, height: 1920 },
  { value: '720x1280', label: '縦 720×1280', width: 720, height: 1280 },
  { value: '1080x1080', label: '正方形 1080×1080', width: 1080, height: 1080 },
  { value: '1920x1080', label: '横 1920×1080 (YouTube)', width: 1920, height: 1080 },
  { value: '1280x720', label: '横 1280×720', width: 1280, height: 720 },
  { value: 'custom', label: 'カスタム', width: 0, height: 0 },
];

// 尺プリセット（秒単位）
const durationPresets = [
  { value: '15', label: '15秒' },
  { value: '30', label: '30秒' },
  { value: '60', label: '60秒 (1分)' },
  { value: '90', label: '90秒 (1分30秒)' },
  { value: '120', label: '120秒 (2分)' },
  { value: 'custom', label: 'カスタム' },
];

// ステップ定義
const STEP_SELECT = 'select';
const STEP_NEW_PROJECT = 'new_project';

function NewProjectDialog({ onLoadProject }) {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectShowNewProjectDialog);

  // ステップ管理
  const [step, setStep] = useState(STEP_SELECT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [resolutionPreset, setResolutionPreset] = useState('1080x1920');
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1920);
  const [fps, setFps] = useState(30);
  const [durationPreset, setDurationPreset] = useState('30');
  const [customDuration, setCustomDuration] = useState(30);

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

    // 尺の取得（秒数からフレーム数に変換）
    let durationSeconds;
    if (durationPreset === 'custom') {
      // カスタム値のバリデーション（1〜600秒）
      durationSeconds = Math.max(1, Math.min(600, customDuration));
    } else {
      durationSeconds = parseInt(durationPreset);
    }
    const totalFrames = durationSeconds * fps;

    // タイムライン初期化
    dispatch(initializeProject({
      resolution: { width, height },
      totalFrames,
      fps,
    }));

    // アセットクリア
    dispatch(clearAssets());

    // プロジェクト情報リセット
    dispatch(newProject());

    // ステップをリセット
    setStep(STEP_SELECT);
  };

  const handleClose = () => {
    // ダイアログを閉じる
    dispatch(setShowNewProjectDialog(false));
    // ステップをリセット
    setStep(STEP_SELECT);
    setErrorMessage('');
  };

  const handleSelectNewProject = () => {
    setStep(STEP_NEW_PROJECT);
    setErrorMessage('');
  };

  const handleSelectOpenProject = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // ファイル選択ダイアログを表示
      const result = await window.api.project.showOpenDialog();

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const loadPath = result.filePath;

      // プロジェクトを読み込み
      const loadResult = await window.api.project.load(loadPath);

      if (!loadResult.success) {
        setErrorMessage(`プロジェクトの読み込みに失敗しました: ${loadResult.error}`);
        setIsLoading(false);
        return;
      }

      // 読み込み成功 - onLoadProjectを呼び出してストアを更新
      if (onLoadProject) {
        await onLoadProject(loadPath);
      }

      // ダイアログを閉じる
      dispatch(setShowNewProjectDialog(false));
      setStep(STEP_SELECT);
    } catch (error) {
      console.error('Error loading project:', error);
      setErrorMessage(`プロジェクト読み込みエラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep(STEP_SELECT);
    setErrorMessage('');
  };

  // キーボードイベント（ESCで閉じる）
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // 選択ステップ
  if (step === STEP_SELECT) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onKeyDown={handleKeyDown}
      >
        <div className="shadow-xl w-full max-w-md rounded-lg border border-line bg-surface-raised">
          {/* ヘッダー */}
          <div className="border-b border-line p-4">
            <h2 className="text-lg font-semibold text-white">プロジェクトを開始</h2>
            <p className="mt-1 text-sm text-ink-muted">新規プロジェクトを作成するか、既存のプロジェクトを開きます</p>
          </div>

          {/* コンテンツ */}
          <div className="space-y-3 p-4">
            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="rounded border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
                {errorMessage}
              </div>
            )}

            {/* 新規プロジェクトを作成 */}
            <button
              onClick={handleSelectNewProject}
              disabled={isLoading}
              className="group w-full rounded-lg border border-line bg-surface-sunken p-4 text-left transition-all hover:border-accent-blue/50 hover:bg-state-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent-blue/20 transition-colors group-hover:bg-accent-blue/30">
                  <FilePlus className="size-6 text-accent-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-white">新規プロジェクトを作成</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">解像度やフレームレートを設定して新しいプロジェクトを開始</p>
                </div>
              </div>
            </button>

            {/* 既存プロジェクトを開く */}
            <button
              onClick={handleSelectOpenProject}
              disabled={isLoading}
              className="hover:border-accent-emerald/50 group w-full rounded-lg border border-line bg-surface-sunken p-4 text-left transition-all hover:bg-state-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="bg-accent-emerald/20 group-hover:bg-accent-emerald/30 flex size-12 items-center justify-center rounded-lg transition-colors">
                  <FolderOpen className="text-accent-emerald size-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-white">
                    {isLoading ? '読み込み中...' : '既存プロジェクトを開く'}
                  </h3>
                  <p className="mt-0.5 text-sm text-ink-muted">.ccproj ファイルを選択して続きから作業</p>
                </div>
              </div>
            </button>
          </div>

          {/* フッター */}
          <div className="flex justify-end border-t border-line p-4">
            <Button
              variant="ghost"
              size="md"
              onClick={handleClose}
              disabled={isLoading}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 新規プロジェクト設定ステップ
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onKeyDown={handleKeyDown}
    >
      <div className="shadow-xl w-full max-w-md rounded-lg border border-line bg-surface-raised">
        {/* ヘッダー */}
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-semibold text-white">新規プロジェクト</h2>
          <p className="mt-1 text-sm text-ink-muted">プロジェクトの設定を選択してください</p>
        </div>

        {/* コンテンツ */}
        <div className="space-y-4 p-4">
          {/* 解像度 */}
          <div>
            <label className="mb-2 block text-sm text-ink-secondary">解像度</label>
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
                <label className="mb-1 block text-xs text-ink-muted">幅</label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-ink-muted">高さ</label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
            </div>
          )}

          {/* FPS */}
          <div>
            <label className="mb-2 block text-sm text-ink-secondary">フレームレート</label>
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

          {/* 尺 */}
          <div>
            <label className="mb-2 block text-sm text-ink-secondary">尺（長さ）</label>
            <Select
              value={durationPreset}
              onChange={(e) => setDurationPreset(e.target.value)}
              options={durationPresets.map(p => ({ value: p.value, label: p.label }))}
              className="w-full"
            />
          </div>

          {/* カスタム尺 */}
          {durationPreset === 'custom' && (
            <div>
              <label className="mb-1 block text-xs text-ink-muted">秒数（1〜600秒）</label>
              <Input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                min={1}
                max={600}
              />
            </div>
          )}

          {/* プレビュー情報 */}
          <div className="rounded border border-line bg-surface-sunken p-3">
            <div className="space-y-1 text-xs text-ink-muted">
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
                <span>フレームレート:</span>
                <span className="text-ink-secondary">
                  {fps} fps
                </span>
              </div>
              <div className="flex justify-between">
                <span>尺:</span>
                <span className="text-ink-secondary">
                  {durationPreset === 'custom'
                    ? `${Math.max(1, Math.min(600, customDuration))}秒`
                    : `${durationPreset}秒`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>総フレーム数:</span>
                <span className="text-ink-secondary">
                  {(durationPreset === 'custom'
                    ? Math.max(1, Math.min(600, customDuration))
                    : parseInt(durationPreset)
                  ) * fps} フレーム
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
            onClick={handleBack}
          >
            戻る
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
