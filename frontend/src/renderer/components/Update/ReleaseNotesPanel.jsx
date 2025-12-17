import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, ExternalLink, Download, RefreshCw, Info } from 'lucide-react';
import { Button } from '../ui';
import { closeReleaseNotes } from '../../store/updateSlice';

// GitHubからリリースノートを取得
async function fetchReleaseNotes(owner, repo, limit = 3) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${limit}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch releases');
    }
    const releases = await response.json();
    return releases.map((release) => ({
      version: release.tag_name.replace(/^v/, ''),
      name: release.name,
      body: release.body,
      publishedAt: release.published_at,
      htmlUrl: release.html_url,
    }));
  } catch (error) {
    console.error('Failed to fetch release notes:', error);
    return [];
  }
}

// Markdownを簡易的にHTMLに変換
function parseMarkdown(text) {
  if (!text) return '';
  return text
    // ヘッダー
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-ink-primary mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-ink-primary mt-4 mb-2">$1</h3>')
    // リスト
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-ink-secondary">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 text-ink-secondary">$1</li>')
    // コードブロック
    .replace(/`([^`]+)`/g, '<code class="bg-surface-highest px-1 rounded text-xs">$1</code>')
    // 太字
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 改行
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// リリースノートの抜粋を取得（最大3件の変更点）
function extractHighlights(body, maxItems = 3) {
  if (!body) return [];
  const lines = body.split('\n');
  const highlights = [];
  for (const line of lines) {
    const match = line.match(/^[-*]\s+(.+)$/);
    if (match && highlights.length < maxItems) {
      highlights.push(match[1]);
    }
  }
  return highlights;
}

function ReleaseNotesPanel() {
  const dispatch = useDispatch();
  const { showReleaseNotes, currentVersion, availableUpdate, status } = useSelector(
    (state) => state.update
  );
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState(null);

  // リリースノートを取得
  useEffect(() => {
    if (showReleaseNotes && releases.length === 0) {
      setLoading(true);
      fetchReleaseNotes('UKIYO-4s', 'clip-composer', 5)
        .then(setReleases)
        .finally(() => setLoading(false));
    }
  }, [showReleaseNotes, releases.length]);

  if (!showReleaseNotes) return null;

  const handleClose = () => {
    dispatch(closeReleaseNotes());
  };

  const handleDownload = async () => {
    if (window.api?.update?.downloadUpdate) {
      await window.api.update.downloadUpdate();
    }
  };

  const handleInstall = () => {
    if (window.api?.update?.quitAndInstall) {
      window.api.update.quitAndInstall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-surface-high shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-surface-highest px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent-purple" />
            <h2 className="text-lg font-semibold text-ink-primary">
              アップデート情報
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-ink-muted hover:bg-surface-highest hover:text-ink-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 現在のバージョン */}
        <div className="border-b border-surface-highest bg-surface-base px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-secondary">
              現在のバージョン: <span className="font-mono">v{currentVersion || '---'}</span>
            </span>
            {availableUpdate && status === 'available' && (
              <span className="rounded bg-accent-purple/20 px-2 py-0.5 text-xs text-accent-purple">
                v{availableUpdate.version} 利用可能
              </span>
            )}
            {status === 'downloaded' && (
              <span className="rounded bg-accent-green/20 px-2 py-0.5 text-xs text-accent-green">
                ダウンロード済み
              </span>
            )}
          </div>
        </div>

        {/* アップデートアクション */}
        {(status === 'available' || status === 'downloaded') && (
          <div className="border-b border-surface-highest px-4 py-3">
            {status === 'available' && (
              <Button variant="primary" size="sm" onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                v{availableUpdate?.version} をダウンロード
              </Button>
            )}
            {status === 'downloaded' && (
              <Button variant="primary" size="sm" onClick={handleInstall} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                再起動してアップデート適用
              </Button>
            )}
          </div>
        )}

        {/* リリースノート一覧 */}
        <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="py-8 text-center text-ink-muted">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-2">リリース情報を取得中...</p>
            </div>
          ) : releases.length === 0 ? (
            <div className="py-8 text-center text-ink-muted">
              <p>リリース情報を取得できませんでした</p>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => {
                const isExpanded = expandedVersion === release.version;
                const highlights = extractHighlights(release.body);
                const isCurrentVersion = release.version === currentVersion;
                const isNewVersion = availableUpdate?.version === release.version;

                return (
                  <div
                    key={release.version}
                    className={`rounded-lg border p-3 ${
                      isNewVersion
                        ? 'border-accent-purple/50 bg-accent-purple/5'
                        : isCurrentVersion
                        ? 'border-accent-green/50 bg-accent-green/5'
                        : 'border-surface-highest bg-surface-base'
                    }`}
                  >
                    {/* バージョンヘッダー */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink-primary">
                          v{release.version}
                        </span>
                        {isCurrentVersion && (
                          <span className="rounded bg-accent-green/20 px-1.5 py-0.5 text-xs text-accent-green">
                            現在
                          </span>
                        )}
                        {isNewVersion && (
                          <span className="rounded bg-accent-purple/20 px-1.5 py-0.5 text-xs text-accent-purple">
                            新着
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted">
                          {new Date(release.publishedAt).toLocaleDateString('ja-JP')}
                        </span>
                        <a
                          href={release.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-muted hover:text-accent-blue"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* リリース名 */}
                    {release.name && release.name !== `v${release.version}` && (
                      <p className="mt-1 text-sm text-ink-secondary">{release.name}</p>
                    )}

                    {/* ハイライト（抜粋） */}
                    {!isExpanded && highlights.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {highlights.map((item, idx) => (
                          <li key={idx} className="text-sm text-ink-secondary">
                            <span className="mr-2 text-ink-muted">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* 全文表示 */}
                    {isExpanded && release.body && (
                      <div
                        className="prose prose-sm prose-invert mt-2 max-w-none"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(release.body) }}
                      />
                    )}

                    {/* 展開/折りたたみ */}
                    {release.body && (
                      <button
                        onClick={() => setExpandedVersion(isExpanded ? null : release.version)}
                        className="mt-2 text-xs text-accent-blue hover:underline"
                      >
                        {isExpanded ? '折りたたむ' : '詳細を表示'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-surface-highest px-4 py-3">
          <Button variant="ghost" size="sm" onClick={handleClose} className="w-full">
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReleaseNotesPanel;
