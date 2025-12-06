import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  newProject,
  setProjectInfo,
  setDirty,
  setLastSaved,
  addRecentFile,
  removeRecentFile,
  selectProjectName,
  selectProjectPath,
  selectIsDirty,
  selectRecentFiles,
  loadProjectState,
} from '../../store/projectSlice';

const FileMenu = ({ onSaveProject, onLoadProject, onNewProject, onSaveAsProject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = useState(false);
  const menuRef = useRef(null);
  const dispatch = useDispatch();

  const projectName = useSelector(selectProjectName);
  const projectPath = useSelector(selectProjectPath);
  const isDirty = useSelector(selectIsDirty);
  const recentFiles = useSelector(selectRecentFiles);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setRecentFilesOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
    setRecentFilesOpen(false);
  };

  const handleNewProject = () => {
    setIsOpen(false);
    if (onNewProject) {
      onNewProject();
    }
  };

  const handleOpenProject = () => {
    setIsOpen(false);
    if (onLoadProject) {
      onLoadProject();
    }
  };

  const handleSave = () => {
    setIsOpen(false);
    if (onSaveProject) {
      onSaveProject();
    }
  };

  const handleSaveAs = () => {
    setIsOpen(false);
    if (onSaveAsProject) {
      onSaveAsProject();
    }
  };

  const handleRecentFileClick = (filePath) => {
    setIsOpen(false);
    setRecentFilesOpen(false);
    if (onLoadProject) {
      onLoadProject(filePath);
    }
  };

  const getFileName = (path) => {
    if (!path) return '';
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* File menu button */}
      <button
        onClick={handleMenuClick}
        className="px-3 py-1 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
      >
        File
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-50">
          {/* New Project */}
          <button
            onClick={handleNewProject}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-sm transition-colors"
          >
            <span>New Project</span>
            <span className="text-xs text-gray-400">Ctrl+N</span>
          </button>

          {/* Open Project */}
          <button
            onClick={handleOpenProject}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-sm transition-colors"
          >
            <span>Open Project</span>
            <span className="text-xs text-gray-400">Ctrl+O</span>
          </button>

          <div className="border-t border-gray-600 my-1"></div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-sm transition-colors"
          >
            <span>Save{isDirty ? ' *' : ''}</span>
            <span className="text-xs text-gray-400">Ctrl+S</span>
          </button>

          {/* Save As */}
          <button
            onClick={handleSaveAs}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-sm transition-colors"
          >
            <span>Save As...</span>
            <span className="text-xs text-gray-400">Ctrl+Shift+S</span>
          </button>

          {/* Recent Files */}
          {recentFiles.length > 0 && (
            <>
              <div className="border-t border-gray-600 my-1"></div>
              <div className="relative">
                <button
                  onMouseEnter={() => setRecentFilesOpen(true)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-sm transition-colors"
                >
                  <span>Recent Files</span>
                  <span className="text-xs">▶</span>
                </button>

                {/* Recent files submenu */}
                {recentFilesOpen && (
                  <div
                    className="absolute left-full top-0 ml-1 w-80 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-96 overflow-y-auto"
                    onMouseLeave={() => setRecentFilesOpen(false)}
                  >
                    {recentFiles.map((filePath, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentFileClick(filePath)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-700 text-sm transition-colors block truncate"
                        title={filePath}
                      >
                        <div className="font-medium">{getFileName(filePath)}</div>
                        <div className="text-xs text-gray-400 truncate">{filePath}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileMenu;
