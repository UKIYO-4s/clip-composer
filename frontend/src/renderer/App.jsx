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
import { openExportDialog } from './store/exportSlice';
import { Button } from './components/ui';
import {
  removeClip,
  splitClip,
  duplicateClip,
  setCurrentFrame,
  setIsPlaying,
  setLoopEnabled,
} from './store/timelineSlice';
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
    selectedClipId,
    layers,
    currentFrame,
    totalFrames,
    isPlaying,
    loopEnabled,
    layerOrder,
  } = useSelector((state) => state.timeline);

  const assets = useSelector((state) => state.assets.items);
  const projectName = useSelector(selectProjectName);
  const projectPath = useSelector(selectProjectPath);
  const isDirty = useSelector(selectIsDirty);

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
          fps: 30,
          resolution: { width: 1920, height: 1080 },
        },
        assets: assets,
        timeline: {
          layers: layers,
          layerOrder: layerOrder,
          totalFrames: totalFrames,
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
        alert('Failed to save project: ' + saveResult.error);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    }
  }, [dispatch, projectPath, projectName, layers, layerOrder, totalFrames, assets]);

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
          fps: 30,
          resolution: { width: 1920, height: 1080 },
        },
        assets: assets,
        timeline: {
          layers: layers,
          layerOrder: layerOrder,
          totalFrames: totalFrames,
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
        alert('Failed to save project: ' + saveResult.error);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    }
  }, [dispatch, projectName, layers, layerOrder, totalFrames, assets]);

  // プロジェクト読み込み処理
  const handleLoadProject = useCallback(async (filePath = null) => {
    try {
      // 未保存の変更がある場合は確認
      if (isDirty) {
        const confirmed = window.confirm('You have unsaved changes. Do you want to continue?');
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
        alert('Failed to load project: ' + loadResult.error);
        return;
      }

      const projectData = loadResult.data;

      // stateを復元（実際の実装では各sliceのアクションを使用）
      // ここでは簡易的な実装
      console.log('Project loaded:', projectData);

      // プロジェクト情報を更新
      const fileName = loadPath.split(/[\\/]/).pop().replace('.ccproj', '');
      dispatch(loadProjectState({
        name: fileName,
        path: loadPath,
        settings: projectData.settings,
        version: projectData.version,
      }));
      dispatch(addRecentFile(loadPath));

      alert('Project loaded successfully! (Note: Full state restoration not yet implemented)');
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error loading project: ' + error.message);
    }
  }, [dispatch, isDirty]);

  // 新規プロジェクト
  const handleNewProject = useCallback(() => {
    // 未保存の変更がある場合は確認
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Do you want to continue?');
      if (!confirmed) {
        return;
      }
    }

    dispatch(newProject());
    console.log('New project created');
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

      // Delete/Backspace: クリップ削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch(removeClip({ layerId: selectedLayerId, clipId: selectedClipId }));
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
        dispatch(duplicateClip({ layerId: selectedLayerId, clipId: selectedClipId }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedClipId,
    layers,
    currentFrame,
    totalFrames,
    isPlaying,
    loopEnabled,
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
              Export
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
      </div>
    </DndProvider>
  );
}

export default App;
