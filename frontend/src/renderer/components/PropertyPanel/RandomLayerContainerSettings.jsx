import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateEnvelope,
  addSegment,
  removeSegment,
  updateSegment,
  splitSegment,
  splitSegmentsEvenly,
  saveToHistory,
} from '../../store/timelineSlice';
import { selectAllRandomLayers, openRandomLayerPanel } from '../../store/randomLayerSlice';
import { Button } from '../ui';
import { ChevronDown, Settings, Plus, Trash2, Scissors } from '../Icons';

// タブボタン
const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
      active
        ? 'bg-surface-raised border-accent-blue text-ink-primary'
        : 'bg-surface border-transparent text-ink-muted hover:text-ink-secondary'
    }`}
  >
    {children}
  </button>
);

// アコーディオンセクション
const Section = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-state-hover transition-colors"
      >
        <span className="text-xs font-semibold text-ink-secondary">{title}</span>
        <ChevronDown
          className={`w-3 h-3 text-ink-muted transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-4 py-2 space-y-2">{children}</div>}
    </div>
  );
};

// フィールド
const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-ink-muted block">{label}</label>
    {children}
  </div>
);

// エンベロープタイプ選択
const ENVELOPE_TYPES = [
  { value: 'none', label: 'なし' },
  { value: 'fade', label: 'フェード' },
  { value: 'scale', label: 'スケール' },
  { value: 'slide', label: 'スライド' },
];

// イージング選択
const EASING_OPTIONS = [
  { value: 'linear', label: 'リニア' },
  { value: 'ease_in', label: 'イーズイン' },
  { value: 'ease_out', label: 'イーズアウト' },
  { value: 'ease_in_out', label: 'イーズインアウト' },
];

// エンベロープ設定コンポーネント
const EnvelopeSettings = ({ envelope, onChange }) => {
  const handleInChange = (key, value) => {
    onChange({ in: { ...envelope?.in, [key]: value } });
  };

  const handleOutChange = (key, value) => {
    onChange({ out: { ...envelope?.out, [key]: value } });
  };

  const inSettings = envelope?.in || { type: 'none', duration_frames: 6, easing: 'ease_in_out' };
  const outSettings = envelope?.out || { type: 'none', duration_frames: 6, easing: 'ease_in_out' };

  return (
    <div className="space-y-3">
      {/* フェードイン */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-ink-secondary">開始時（IN）</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="タイプ">
            <select
              value={inSettings.type}
              onChange={(e) => handleInChange('type', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            >
              {ENVELOPE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          {inSettings.type !== 'none' && (
            <>
              <Field label="フレーム">
                <Input
                  type="number"
                  value={inSettings.duration_frames}
                  onChange={(e) => handleInChange('duration_frames', parseInt(e.target.value) || 6)}
                  min={1}
                  max={120}
                  className="text-xs"
                />
              </Field>
              <Field label="イージング">
                <select
                  value={inSettings.easing}
                  onChange={(e) => handleInChange('easing', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
                >
                  {EASING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      </div>

      {/* フェードアウト */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-ink-secondary">終了時（OUT）</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="タイプ">
            <select
              value={outSettings.type}
              onChange={(e) => handleOutChange('type', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
            >
              {ENVELOPE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          {outSettings.type !== 'none' && (
            <>
              <Field label="フレーム">
                <Input
                  type="number"
                  value={outSettings.duration_frames}
                  onChange={(e) => handleOutChange('duration_frames', parseInt(e.target.value) || 6)}
                  min={1}
                  max={120}
                  className="text-xs"
                />
              </Field>
              <Field label="イージング">
                <select
                  value={outSettings.easing}
                  onChange={(e) => handleOutChange('easing', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
                >
                  {EASING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// セグメントミニタイムライン
const SegmentMiniTimeline = ({ segments, containerDuration, selectedSegmentId, onSelectSegment }) => {
  if (!segments || segments.length === 0) {
    return (
      <div className="h-8 bg-surface-sunken rounded border border-line flex items-center justify-center text-xs text-ink-muted">
        セグメントなし
      </div>
    );
  }

  return (
    <div className="h-8 bg-surface-sunken rounded border border-line flex overflow-hidden">
      {segments.map((segment, index) => {
        const widthPercent = (segment.duration / containerDuration) * 100;
        const isSelected = segment.id === selectedSegmentId;

        // ランダムレイヤーの色をハッシュから生成
        const hue = segment.randomLayerId
          ? parseInt(segment.randomLayerId.slice(-6), 16) % 360
          : 200;

        return (
          <button
            key={segment.id}
            onClick={() => onSelectSegment(segment.id)}
            className={`h-full flex items-center justify-center text-[10px] font-medium transition-all ${
              isSelected ? 'ring-2 ring-accent-blue ring-inset' : ''
            }`}
            style={{
              width: `${widthPercent}%`,
              backgroundColor: `hsla(${hue}, 60%, 50%, ${isSelected ? 0.8 : 0.5})`,
              borderRight: index < segments.length - 1 ? '1px solid rgba(0,0,0,0.3)' : 'none',
            }}
            title={`${segment.duration}f`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
};

// セグメント詳細設定
const SegmentDetails = ({ segment, randomLayers, onUpdate, onRemove, onSplit }) => {
  const [splitFrame, setSplitFrame] = useState(Math.floor(segment.duration / 2));

  return (
    <div className="p-3 bg-surface-sunken rounded border border-line space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-secondary">
          セグメント設定
        </span>
        <button
          onClick={onRemove}
          className="p-1 text-accent-red hover:bg-accent-red/10 rounded transition-colors"
          title="セグメントを削除"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="開始オフセット">
          <Input
            type="number"
            value={segment.startOffset}
            onChange={(e) => onUpdate({ startOffset: parseInt(e.target.value) || 0 })}
            min={0}
            className="text-xs"
          />
        </Field>
        <Field label="長さ">
          <Input
            type="number"
            value={segment.duration}
            onChange={(e) => onUpdate({ duration: Math.max(1, parseInt(e.target.value) || 1) })}
            min={1}
            className="text-xs"
          />
        </Field>
      </div>

      <Field label="ランダムレイヤー">
        <select
          value={segment.randomLayerId || ''}
          onChange={(e) => onUpdate({ randomLayerId: e.target.value || null })}
          className="w-full px-2 py-1 text-xs bg-surface border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
        >
          <option value="">（親から継承）</option>
          {randomLayers.map((rl) => (
            <option key={rl.id} value={rl.id}>
              {rl.name} ({rl.assets?.length || 0}素材)
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="音声ゲイン">
          <Input
            type="number"
            value={segment.audioGain ?? 1.0}
            onChange={(e) => onUpdate({ audioGain: parseFloat(e.target.value) || 1.0 })}
            min={0}
            max={2}
            step={0.1}
            className="text-xs"
          />
        </Field>
        <Field label="再生速度">
          <Input
            type="number"
            value={segment.speed ?? 1.0}
            onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) || 1.0 })}
            min={0.1}
            max={4}
            step={0.1}
            className="text-xs"
          />
        </Field>
      </div>

      {/* 分割 */}
      <div className="pt-2 border-t border-line">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={splitFrame}
            onChange={(e) => setSplitFrame(parseInt(e.target.value) || 0)}
            min={1}
            max={segment.duration - 1}
            className="w-20 text-xs"
            placeholder="位置"
          />
          <Button
            variant="subtle"
            size="sm"
            onClick={() => onSplit(segment.startOffset + splitFrame)}
            disabled={splitFrame <= 0 || splitFrame >= segment.duration}
            className="flex items-center gap-1"
          >
            <Scissors className="w-3 h-3" />
            分割
          </Button>
        </div>
      </div>
    </div>
  );
};

// メインコンポーネント
const RandomLayerContainerSettings = ({ clip, layerId, onUpdate }) => {
  const dispatch = useDispatch();
  const randomLayers = useSelector(selectAllRandomLayers);
  const [activeTab, setActiveTab] = useState('container'); // 'container' | 'segments'
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  // 選択中のセグメント
  const selectedSegment = useMemo(() => {
    return clip.segments?.find((s) => s.id === selectedSegmentId);
  }, [clip.segments, selectedSegmentId]);

  // エンベロープ更新
  const handleEnvelopeChange = (envelope) => {
    dispatch(saveToHistory());
    dispatch(updateEnvelope({ layerId, clipId: clip.id, envelope }));
  };

  // セグメント追加
  const handleAddSegment = () => {
    dispatch(saveToHistory());
    const lastSegment = clip.segments?.[clip.segments.length - 1];
    const startOffset = lastSegment
      ? lastSegment.startOffset + lastSegment.duration
      : 0;
    const remainingDuration = clip.durationFrames - startOffset;

    if (remainingDuration <= 0) {
      alert('コンテナに空き領域がありません');
      return;
    }

    dispatch(addSegment({
      layerId,
      clipId: clip.id,
      segment: {
        startOffset,
        duration: Math.min(30, remainingDuration),
        randomLayerId: clip.randomLayerId || null,
      },
    }));
  };

  // セグメント削除
  const handleRemoveSegment = (segmentId) => {
    dispatch(saveToHistory());
    dispatch(removeSegment({ layerId, clipId: clip.id, segmentId }));
    setSelectedSegmentId(null);
  };

  // セグメント更新
  const handleUpdateSegment = (segmentId, updates) => {
    dispatch(saveToHistory());
    dispatch(updateSegment({ layerId, clipId: clip.id, segmentId, updates }));
  };

  // セグメント分割
  const handleSplitSegment = (segmentId, splitOffset) => {
    dispatch(saveToHistory());
    dispatch(splitSegment({ layerId, clipId: clip.id, segmentId, splitOffset }));
  };

  // 等間隔分割
  const handleEvenSplit = (count) => {
    dispatch(saveToHistory());
    dispatch(splitSegmentsEvenly({ layerId, clipId: clip.id, count }));
  };

  return (
    <div className="space-y-2">
      {/* タブ */}
      <div className="flex gap-1 border-b border-line">
        <TabButton active={activeTab === 'container'} onClick={() => setActiveTab('container')}>
          コンテナ設定
        </TabButton>
        <TabButton active={activeTab === 'segments'} onClick={() => setActiveTab('segments')}>
          セグメント ({clip.segments?.length || 0})
        </TabButton>
      </div>

      {/* コンテナ設定タブ */}
      {activeTab === 'container' && (
        <div className="space-y-2">
          {/* エンベロープ */}
          <Section title="エンベロープ（IN/OUT効果）" defaultOpen={true}>
            <EnvelopeSettings
              envelope={clip.envelope}
              onChange={handleEnvelopeChange}
            />
          </Section>

          {/* ランダムレイヤー管理 */}
          <Section title="ランダムレイヤー" defaultOpen={true}>
            <div className="space-y-2">
              <Field label="デフォルトプール">
                <select
                  value={clip.randomLayerId || ''}
                  onChange={(e) => onUpdate({ randomLayerId: e.target.value || null })}
                  className="w-full px-2 py-1 text-xs bg-surface-sunken border border-line rounded focus:outline-none focus:border-accent-blue text-ink-primary"
                >
                  <option value="">（未設定）</option>
                  {randomLayers.map((rl) => (
                    <option key={rl.id} value={rl.id}>
                      {rl.name} ({rl.assets?.length || 0}素材)
                    </option>
                  ))}
                </select>
              </Field>
              {clip.randomLayerId && (
                <p className="text-xs text-ink-muted">
                  ID: {clip.randomLayerId.slice(-8)}
                </p>
              )}
              <Button
                variant="subtle"
                size="sm"
                onClick={() => dispatch(openRandomLayerPanel())}
                className="w-full flex items-center justify-center gap-1"
              >
                <Settings className="w-3 h-3" />
                ランダムレイヤー管理
              </Button>
            </div>
          </Section>
        </div>
      )}

      {/* セグメントタブ */}
      {activeTab === 'segments' && (
        <div className="space-y-3">
          {/* ミニタイムライン */}
          <SegmentMiniTimeline
            segments={clip.segments}
            containerDuration={clip.durationFrames}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={setSelectedSegmentId}
          />

          {/* 操作ボタン */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="subtle"
              size="sm"
              onClick={handleAddSegment}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              追加
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-muted">等分割:</span>
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => handleEvenSplit(n)}
                  className="px-2 py-1 text-xs bg-surface-sunken border border-line rounded hover:bg-state-hover text-ink-secondary"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 選択中のセグメント詳細 */}
          {selectedSegment ? (
            <SegmentDetails
              segment={selectedSegment}
              randomLayers={randomLayers}
              onUpdate={(updates) => handleUpdateSegment(selectedSegment.id, updates)}
              onRemove={() => handleRemoveSegment(selectedSegment.id)}
              onSplit={(offset) => handleSplitSegment(selectedSegment.id, offset)}
            />
          ) : (
            <div className="p-3 bg-surface-sunken rounded border border-line text-center text-xs text-ink-muted">
              タイムラインでセグメントをクリックして選択
            </div>
          )}

          {/* セグメント一覧（テキスト） */}
          {clip.segments && clip.segments.length > 0 && (
            <div className="text-xs text-ink-muted space-y-1">
              {clip.segments.map((seg, idx) => (
                <div
                  key={seg.id}
                  className={`flex justify-between px-2 py-1 rounded cursor-pointer hover:bg-state-hover ${
                    seg.id === selectedSegmentId ? 'bg-accent-blue/10' : ''
                  }`}
                  onClick={() => setSelectedSegmentId(seg.id)}
                >
                  <span>#{idx + 1}</span>
                  <span>{seg.startOffset}f - {seg.startOffset + seg.duration}f</span>
                  <span>({seg.duration}f)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RandomLayerContainerSettings;
