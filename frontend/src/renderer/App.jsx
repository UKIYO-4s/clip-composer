import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Timeline from './components/Timeline/Timeline';
import Preview from './components/Preview';
import PropertyPanel from './components/PropertyPanel';
import AssetPanel from './components/AssetPanel';
import FileMenu from './components/Menu/FileMenu';
import ExportDialog from './components/ExportDialog';
import NewProjectDialog from './components/NewProjectDialog';
import useAutoSave from './hooks/useAutoSave';
import { openExportDialog } from './store/exportSlice';
import { setShowNewProjectDialog } from './store/timelineSlice';
import { Button } from './components/ui';
import {
  removeClip,
  removeClips,
  splitClip,
  duplicateClip,
  duplicateClipsWithDelta,
  setCurrentFrame,
  setIsPlaying,
  setLoopEnabled,
  saveToHistory,
  undo,
  redo,
  copyClips,
  pasteClips,
  selectAllClips,
  selectCanUndo,
  selectCanRedo,
  selectResolution,
  selectFps,
  loadTimeline,
} from './store/timelineSlice';
import { setAssets, clearAssets } from './store/assetsSlice';
import {
  newProject,
  setProjectInfo,
  setDirty,
  setLastSaved,
  addRecentFile,
  loadProjectState,
  selectProjectName,
  selectProjectPath,
  selectIsDirty,
} from './store/projectSlice';

function App() {
  const dispatch = useDispatch();
  const {
    selectedClipIds,
    layers,
    currentFrame,
    totalFrames,
    isPlaying,
    loopEnabled,
    layerOrder,
  } = useSelector((state) => state.timeline);
  const selectedClipId = selectedClipIds?.[0]; // 後方互換

  const assets = useSelector((state) => state.assets.items);
  const projectName = useSelector(selectProjectName);
  const projectPath = useSelector(selectProjectPath);
  const isDirty = useSelector(selectIsDirty);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const resolution = useSelector(selectResolution);
  const fps = useSelector(selectFps);

  // 自動保存（3分間隔）
  const { lastSaveTime, isSaving } = useAutoSave({
    interval: 3 * 60 * 1000,
    enabled: true,
  });

  // エクスポートダイアログを開く
  const handleOpenExport = useCallback(() => {
    dispatch(openExportDialog());
  }, [dispatch]);

  // プロジェクト保存処理
  const handleSaveProject = useCallback(async () => {
    try {
      let savePath = projectPath;

      // パスがない場合は保存ダイアログを表示
      if (!savePath) {
        const result = await window.api.project.showSaveDialog({
          defaultPath: `${projectName}.ccproj`,
        });

        if (result.canceled) {
          return;
        }
        savePath = result.filePath;
      }

      // プロジェクトデータを作成
      const projectData = {
        version: '1.0',
        name: projectName,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        settings: {
          fps: fps,
          resolution: resolution,
        },
        assets: assets,
        timeline: {
          layers: layers,
          layerOrder: layerOrder,
          totalFrames: totalFrames,
          resolution: resolution,
          fps: fps,
        },
      };

      // 保存
      const saveResult = await window.api.project.save(savePath, projectData);

      if (saveResult.success) {
        dispatch(setProjectInfo({ path: savePath }));
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(addRecentFile(savePath));
        console.log('Project saved successfully:', savePath);
      } else {
        console.error('Failed to save project:', saveResult.error);
        alert('プロジェクトの保存に失敗しました: ' + saveResult.error);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('プロジェクト保存エラー: ' + error.message);
    }
  }, [dispatch, projectPath, projectName, layers, layerOrder, totalFrames, assets, resolution, fps]);

  // 名前を付けて保存
  const handleSaveAsProject = useCallback(async () => {
    try {
      const result = await window.api.project.showSaveDialog({
        defaultPath: `${projectName}.ccproj`,
      });

      if (result.canceled) {
        return;
      }

      const savePath = result.filePath;

      // プロジェクトデータを作成
      const projectData = {
        version: '1.0',
        name: projectName,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        settings: {
          fps: fps,
          resolution: resolution,
        },
        assets: assets,
        timeline: {
          layers: layers,
          layerOrder: layerOrder,
          totalFrames: totalFrames,
          resolution: resolution,
          fps: fps,
        },
      };

      // 保存
      const saveResult = await window.api.project.save(savePath, projectData);

      if (saveResult.success) {
        const fileName = savePath.split(/[\\/]/).pop().replace('.ccproj', '');
        dispatch(setProjectInfo({ name: fileName, path: savePath }));
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(addRecentFile(savePath));
        console.log('Project saved as:', savePath);
      } else {
        console.error('Failed to save project:', saveResult.error);
        alert('プロジェクトの保存に失敗しました: ' + saveResult.error);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('プロジェクト保存エラー: ' + error.message);
    }
  }, [dispatch, projectName, layers, layerOrder, totalFrames, assets, resolution, fps]);

  // プロジェクト読み込み処理
  const handleLoadProject = useCallback(async (filePath = null) => {
    try {
      // 未保存の変更がある場合は確認
      if (isDirty) {
        const confirmed = window.confirm('保存されていない変更があります。続行しますか？');
        if (!confirmed) {
          return;
        }
      }

      let loadPath = filePath;

      // パスが指定されていない場合は開くダイアログを表示
      if (!loadPath) {
        const result = await window.api.project.showOpenDialog();

        if (result.canceled) {
          return;
        }
        loadPath = result.filePath;
      }

      // プロジェクトを読み込み
      const loadResult = await window.api.project.load(loadPath);

      if (!loadResult.success) {
        console.error('Failed to load project:', loadResult.error);
        alert('プロジェクトの読み込みに失敗しました: ' + loadResult.error);
        return;
      }

      const projectData = loadResult.data;
      console.log('Project loaded:', projectData);

      // プロジェクト情報を更新
      const fileName = loadPath.split(/[\\/]/).pop().replace('.ccproj', '');
      dispatch(loadProjectState({
        name: fileName,
        path: loadPath,
        settings: projectData.settings,
        version: projectData.version,
      }));

      // タイムライン状態を復元
      if (projectData.timeline) {
        dispatch(loadTimeline({
          layers: projectData.timeline.layers,
          layerOrder: projectData.timeline.layerOrder,
          totalFrames: projectData.timeline.totalFrames,
          resolution: projectData.timeline.resolution || projectData.settings?.resolution,
          fps: projectData.timeline.fps || projectData.settings?.fps,
        }));
      }

      // アセット状態を復元
      if (projectData.assets) {
        dispatch(setAssets(projectData.assets));
      }

      dispatch(addRecentFile(loadPath));
      console.log('Project fully restored:', loadPath);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('プロジェクト読み込みエラー: ' + error.message);
    }
  }, [dispatch, isDirty]);

  // 新規プロジェクト
  const handleNewProject = useCallback(() => {
    // 未保存の変更がある場合は確認
    if (isDirty) {
      const confirmed = window.confirm('保存されていない変更があります。続行しますか？');
      if (!confirmed) {
        return;
      }
    }

    // 新規プロジェクトダイアログを表示
    dispatch(setShowNewProjectDialog(true));
  }, [dispatch, isDirty]);

  // テンプレートとして保存
  const handleSaveAsTemplate = useCallback(async () => {
    const templateName = window.prompt('テンプレート名を入力してください', projectName);
    if (!templateName) return;

    try {
      const projectData = {
        version: '1.0',
        name: templateName,
        settings: {
          fps: fps,
          resolution: resolution,
        },
        assets: assets,
        timeline: {
          layers: layers,
          layerOrder: layerOrder,
          totalFrames: totalFrames,
          resolution: resolution,
          fps: fps,
        },
      };

      const result = await window.api.templates.save(templateName, projectData);

      if (result.success) {
        alert(`テンプレート「${templateName}」を保存しました`);
      } else {
        alert('テンプレートの保存に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('テンプレート保存エラー: ' + error.message);
    }
  }, [projectName, layers, layerOrder, totalFrames, assets, resolution, fps]);

  // テンプレートから読み込み
  const handleLoadTemplate = useCallback(async (templateName) => {
    // 未保存の変更がある場合は確認
    if (isDirty) {
      const confirmed = window.confirm('保存されていない変更があります。続行しますか？');
      if (!confirmed) {
        return;
      }
    }

    try {
      const result = await window.api.templates.load(templateName);

      if (!result.success) {
        alert('テンプレートの読み込みに失敗しました: ' + result.error);
        return;
      }

      const templateData = result.data;

      // プロジェクト情報を更新（テンプレートから新規作成）
      dispatch(loadProjectState({
        name: `${templateName}_copy`,
        path: null,
        settings: templateData.settings,
        version: templateData.version,
      }));

      // タイムライン状態を復元
      if (templateData.timeline) {
        dispatch(loadTimeline({
          layers: templateData.timeline.layers,
          layerOrder: templateData.timeline.layerOrder,
          totalFrames: templateData.timeline.totalFrames,
          resolution: templateData.timeline.resolution || templateData.settings?.resolution,
          fps: templateData.timeline.fps || templateData.settings?.fps,
        }));
      }

      // アセット状態を復元
      if (templateData.assets) {
        dispatch(setAssets(templateData.assets));
      }

      dispatch(setDirty(true)); // 新規作成なのでdirtyにする
      console.log('Template loaded:', templateName);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('テンプレート読み込みエラー: ' + error.message);
    }
  }, [dispatch, isDirty]);

  // 未保存の変更がある場合の警告
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // macOSでファイルをダブルクリックで開いた場合
  useEffect(() => {
    if (window.api?.project?.onOpenFile) {
      const unsubscribe = window.api.project.onOpenFile((filePath) => {
        console.log('Received open-project-file event:', filePath);
        handleLoadProject(filePath);
      });
      return () => unsubscribe();
    }
  }, [handleLoadProject]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // プロジェクト操作のショートカット
      // Ctrl+N: 新規プロジェクト
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewProject();
        return;
      }

      // Ctrl+O: プロジェクトを開く
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleLoadProject();
        return;
      }

      // Ctrl+S: 保存
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // Ctrl+Shift+S: 名前を付けて保存
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSaveAsProject();
        return;
      }

      // Ctrl+E: エクスポート
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleOpenExport();
        return;
      }

      // Cmd/Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) {
          dispatch(undo());
        }
        return;
      }

      // Cmd/Ctrl+Shift+Z または Cmd/Ctrl+Y: Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) {
          dispatch(redo());
        }
        return;
      }

      // Cmd/Ctrl+C: コピー
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedClipIds.length > 0) {
          dispatch(copyClips({ clipIds: selectedClipIds }));
        }
        return;
      }

      // Cmd/Ctrl+V: ペースト
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        dispatch(saveToHistory());
        dispatch(pasteClips({ targetFrame: currentFrame }));
        return;
      }

      // Cmd/Ctrl+A: 全選択
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        dispatch(selectAllClips());
        return;
      }

      // トランスポートコントロール（常に有効）
      // Space: 再生/停止
      if (e.key === ' ') {
        e.preventDefault();
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      // Home: 先頭へ移動
      if (e.key === 'Home') {
        e.preventDefault();
        dispatch(setCurrentFrame(0));
        return;
      }

      // End: 末尾へ移動
      if (e.key === 'End') {
        e.preventDefault();
        dispatch(setCurrentFrame(totalFrames - 1));
        return;
      }

      // ArrowLeft: 1フレーム戻る（Shiftキーで10フレーム）
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        dispatch(setCurrentFrame(Math.max(0, currentFrame - step)));
        return;
      }

      // ArrowRight: 1フレーム進む（Shiftキーで10フレーム）
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        dispatch(setCurrentFrame(Math.min(totalFrames - 1, currentFrame + step)));
        return;
      }

      // L: ループ切替
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        dispatch(setLoopEnabled(!loopEnabled));
        return;
      }

      // Delete/Backspace: クリップ削除（選択クリップがある場合のみ）
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          dispatch(saveToHistory());
          dispatch(removeClips({ clipIds: selectedClipIds }));
        }
        return;
      }

      // 以下はクリップ選択時のみ有効
      if (!selectedClipId) {
        return;
      }

      // 選択中のクリップのレイヤーを検索
      let selectedLayerId = null;
      let selectedClip = null;

      for (const [layerId, layer] of Object.entries(layers)) {
        const clip = layer.clips.find((c) => c.id === selectedClipId);
        if (clip) {
          selectedLayerId = layerId;
          selectedClip = clip;
          break;
        }
      }

      if (!selectedLayerId || !selectedClip) {
        return;
      }

      // S: 再生ヘッド位置で分割
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const clipEndFrame = selectedClip.startFrame + selectedClip.durationFrames;

        // 再生ヘッドがクリップの範囲内にあるかチェック
        if (currentFrame > selectedClip.startFrame && currentFrame < clipEndFrame) {
          dispatch(splitClip({
            layerId: selectedLayerId,
            clipId: selectedClipId,
            splitFrame: currentFrame,
          }));
        }
      }

      // Ctrl+D (Mac: Cmd+D): クリップ複製
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        dispatch(saveToHistory());

        if (selectedClipIds.length > 1) {
          // 複数選択時: 全クリップを直後に複製
          const clipMoves = [];
          let maxEndFrame = 0;

          // 選択されたクリップの情報を収集
          Object.entries(layers).forEach(([layerId, layer]) => {
            layer.clips.forEach(clip => {
              if (selectedClipIds.includes(clip.id)) {
                clipMoves.push({
                  fromLayerId: layerId,
                  clipId: clip.id,
                  originalStartFrame: clip.startFrame,
                });
                const endFrame = clip.startFrame + clip.durationFrames;
                if (endFrame > maxEndFrame) {
                  maxEndFrame = endFrame;
                }
              }
            });
          });

          // 最も早い開始フレームを計算
          const minStartFrame = Math.min(...clipMoves.map(c => c.originalStartFrame));
          // 複製先は全クリップの終了位置の直後
          const deltaFrame = maxEndFrame - minStartFrame;

          dispatch(duplicateClipsWithDelta({
            clipMoves,
            deltaFrame,
            targetLayerId: null,
          }));
        } else if (selectedClipId && selectedLayerId) {
          // 単一選択時
          dispatch(duplicateClip({ layerId: selectedLayerId, clipId: selectedClipId }));
        }
        return;
      }

      // 矢印キー: フレーム移動
      // 左矢印: 1フレーム戻る（Shift: 5フレーム）
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        dispatch(setCurrentFrame(Math.max(0, currentFrame - step)));
        return;
      }

      // 右矢印: 1フレーム進む（Shift: 5フレーム）
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        dispatch(setCurrentFrame(Math.min(totalFrames - 1, currentFrame + step)));
        return;
      }

      // 上矢印: 直前のクリップの切れ目にジャンプ
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        // 全クリップの境界フレームを収集
        const boundaries = new Set([0]);
        Object.values(layers).forEach(layer => {
          layer.clips.forEach(clip => {
            boundaries.add(clip.startFrame);
            boundaries.add(clip.startFrame + clip.durationFrames);
          });
        });
        // 現在位置より前の境界を探す
        const sortedBoundaries = [...boundaries].sort((a, b) => b - a);
        const prevBoundary = sortedBoundaries.find(b => b < currentFrame);
        if (prevBoundary !== undefined) {
          dispatch(setCurrentFrame(prevBoundary));
        }
        return;
      }

      // 下矢印: 直後のクリップの切れ目にジャンプ
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // 全クリップの境界フレームを収集
        const boundaries = new Set();
        Object.values(layers).forEach(layer => {
          layer.clips.forEach(clip => {
            boundaries.add(clip.startFrame);
            boundaries.add(clip.startFrame + clip.durationFrames);
          });
        });
        // 現在位置より後の境界を探す
        const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
        const nextBoundary = sortedBoundaries.find(b => b > currentFrame);
        if (nextBoundary !== undefined) {
          dispatch(setCurrentFrame(nextBoundary));
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedClipIds,
    selectedClipId,
    layers,
    currentFrame,
    totalFrames,
    isPlaying,
    loopEnabled,
    canUndo,
    canRedo,
    dispatch,
    handleNewProject,
    handleLoadProject,
    handleSaveProject,
    handleSaveAsProject,
    handleOpenExport,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full w-full flex-col bg-surface-base text-ink-primary">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-line bg-surface-raised px-4">
          <div className="flex items-center gap-4">
            <FileMenu
              onNewProject={handleNewProject}
              onLoadProject={handleLoadProject}
              onSaveProject={handleSaveProject}
              onSaveAsProject={handleSaveAsProject}
              onSaveAsTemplate={handleSaveAsTemplate}
              onLoadTemplate={handleLoadTemplate}
            />
            <h1 className="text-lg font-semibold">
              {projectName}
              {isDirty && <span className="ml-2 text-accent-amber">*</span>}
            </h1>
            {projectPath && (
              <span className="max-w-xs truncate text-xs text-ink-muted" title={projectPath}>
                {projectPath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenExport}
            >
              エクスポート
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - 素材パネル */}
          <aside className="relative w-64 flex-shrink-0 border-r border-line-subtle bg-surface-sunken">
            <AssetPanel />
          </aside>

          {/* Preview Panel - 中央配置 */}
          <main className="flex-1 flex flex-col">
            <Preview />
          </main>

          {/* Right Sidebar - プロパティパネル */}
          <aside className="w-80 flex-shrink-0 border-l border-line-subtle bg-surface-sunken">
            <PropertyPanel />
          </aside>
        </div>

        {/* Timeline */}
        <Timeline />

        {/* Footer */}
        <footer className="flex h-6 items-center justify-center border-t border-line bg-surface-raised">
          <span className="text-xs text-ink-muted">Clip Composer v1.0.0</span>
        </footer>

        {/* Export Dialog */}
        <ExportDialog />

        {/* New Project Dialog */}
        <NewProjectDialog onLoadProject={handleLoadProject} />
      </div>
    </DndProvider>
  );
}

export default App;
