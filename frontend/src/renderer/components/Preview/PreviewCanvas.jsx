import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { loadImage, getVideoElement, seekVideoToTime } from '../../hooks/useMediaCache';

/**
 * PreviewCanvas - Canvas要素でフレームを描画
 * 複数レイヤーの合成表示、画像・動画・テキストクリップのレンダリング
 */
function PreviewCanvas() {
  const canvasRef = useRef(null);
  const { layers, layerOrder, currentFrame, fps, resolution } = useSelector((state) => state.timeline);
  const [mediaReady, setMediaReady] = useState({});
  const [showOverlay, setShowOverlay] = useState(true); // プレビューオーバーレイ表示フラグ

  // キャンバスサイズ
  const canvasWidth = resolution?.width || 1080;
  const canvasHeight = resolution?.height || 1920;

  // 現在フレームで表示すべきクリップを取得
  const getVisibleClips = useCallback(() => {
    const visibleClips = [];

    // レイヤー順序を逆順（下のレイヤーから上へ）で処理
    [...layerOrder].reverse().forEach((layerId) => {
      const layer = layers[layerId];
      if (!layer) return;

      layer.clips.forEach((clip) => {
        const clipEndFrame = clip.startFrame + clip.durationFrames;
        // 現在フレームがクリップの範囲内にあるかチェック
        if (currentFrame >= clip.startFrame && currentFrame < clipEndFrame) {
          visibleClips.push({
            ...clip,
            layerId,
            layerType: layer.type,
          });
        }
      });
    });

    return visibleClips;
  }, [layers, layerOrder, currentFrame]);

  // 可変テキストのテンプレートを展開
  const renderVariableText = (clip) => {
    if (clip.type === 'variable_text') {
      let text = clip.template || '';
      const values = clip.variableValues || {};
      Object.entries(values).forEach(([key, value]) => {
        text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
      });
      return text || clip.name;
    }
    if (clip.type === 'csv_text_placeholder') {
      return clip.csvResolvedText || `[${clip.csvColumnName || 'CSV'}]`;
    }
    return clip.textContent || clip.name;
  };

  // メディアをプリロード
  useEffect(() => {
    const visibleClips = getVisibleClips();

    visibleClips.forEach(async (clip) => {
      const filePath = clip.filePath || clip.selectedFilePath;
      if (!filePath) return;

      // 既に読み込み済みならスキップ
      if (mediaReady[filePath]) return;

      try {
        if (clip.type === 'image' || clip.type === 'random_layer') {
          await loadImage(filePath);
          setMediaReady(prev => ({ ...prev, [filePath]: 'image' }));
        } else if (clip.type === 'video') {
          await getVideoElement(filePath);
          setMediaReady(prev => ({ ...prev, [filePath]: 'video' }));
        }
      } catch (e) {
        console.error('Media preload failed:', filePath, e);
      }
    });
  }, [getVisibleClips, mediaReady]);

  // イージング関数
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const cubicBezier = (t, p1, p2, p3, p4) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    let y = uuu * 0;
    y += 3 * uu * t * p2;
    y += 3 * u * tt * p4;
    y += ttt * 1;
    return y;
  };

  const parseCubicBezier = (name) => {
    if (!name) return null;
    const prefix = 'cubic-bezier(';
    if (!name.startsWith(prefix) || !name.endsWith(')')) return null;
    const content = name.slice(prefix.length, -1);
    const parts = content.split(',').map((p) => p.trim());
    if (parts.length !== 4) return null;
    const nums = parts.map((p) => parseFloat(p));
    if (nums.some((n) => Number.isNaN(n))) return null;
    return nums;
  };

  const easingPresets = {
    linear: (t) => t,
    'ease-in': (t) => t * t,
    'ease-out': (t) => t * (2 - t),
    'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  };

  const getEasingFn = (name, bezier) => {
    if (!name) return easingPresets.linear;
    const normalized = name.replace('_', '-');
    if (normalized === 'cubic-bezier' && Array.isArray(bezier) && bezier.length === 4) {
      return (t) => cubicBezier(clamp(t), bezier[0], bezier[1], bezier[2], bezier[3]);
    }
    const parsed = parseCubicBezier(normalized);
    if (parsed) {
      return (t) => cubicBezier(clamp(t), parsed[0], parsed[1], parsed[2], parsed[3]);
    }
    return easingPresets[normalized] || easingPresets.linear;
  };

  // エンベロープ値を計算（0-1の範囲でopacity/scaleなどに適用）
  const calculateEnvelopeValue = (clip, relativeFrame) => {
    const envelope = clip.envelope;
    if (!envelope) return 1.0;

    const duration = clip.durationFrames;
    const inEnv = envelope.in;
    const outEnv = envelope.out;

    let value = 1.0;

    // IN効果（開始時）
    if (inEnv && inEnv.type !== 'none' && relativeFrame < inEnv.duration_frames) {
      const t = relativeFrame / inEnv.duration_frames;
      const easedT = getEasingFn(inEnv.easing)(t);
      value *= easedT;
    }

    // OUT効果（終了時）
    if (outEnv && outEnv.type !== 'none') {
      const outStart = duration - outEnv.duration_frames;
      if (relativeFrame >= outStart) {
        const t = 1 - (relativeFrame - outStart) / outEnv.duration_frames;
        const easedT = getEasingFn(outEnv.easing)(t);
        value *= easedT;
      }
    }

    return Math.max(0, Math.min(1, value));
  };

  // 現在のフレームに対応するセグメントを取得
  const getCurrentSegment = (clip, relativeFrame) => {
    if (!clip.segments || clip.segments.length === 0) {
      return null;
    }

    // relativeFrameが含まれるセグメントを検索
    for (const segment of clip.segments) {
      const segmentEnd = segment.startOffset + segment.duration;
      if (relativeFrame >= segment.startOffset && relativeFrame < segmentEnd) {
        return segment;
      }
    }

    // ギャップ期間ならnullを返す（何も描画しない）
    return null;
  };

  // メディアを描画（変形適用）
  const getTransformOverrides = (clip, relativeFrame) => {
    const keyframes = clip.transformKeyframes;
    if (!keyframes) return {};

    const duration = clip.durationFrames || 1;
    const progress = duration > 1 ? clamp(relativeFrame / (duration - 1)) : 0;
    const overrides = {};

    const opacityKeyframe = keyframes.opacity;
    if (opacityKeyframe?.enabled) {
      const easingFn = getEasingFn(opacityKeyframe.easing, opacityKeyframe.bezier);
      const eased = easingFn(progress);
      const start = opacityKeyframe.start ?? (clip.opacity ?? 100);
      const end = opacityKeyframe.end ?? (clip.opacity ?? 100);
      overrides.opacity = (start + (end - start) * eased) / 100;
    }

    const scaleKeyframe = keyframes.scale;
    if (scaleKeyframe?.enabled) {
      const easingFn = getEasingFn(scaleKeyframe.easing, scaleKeyframe.bezier);
      const eased = easingFn(progress);
      const start = scaleKeyframe.start ?? (clip.scale ?? 100);
      const end = scaleKeyframe.end ?? (clip.scale ?? 100);
      overrides.scale = (start + (end - start) * eased) / 100;
    }

    return overrides;
  };

  const drawMedia = (ctx, media, clip, width, height, envelopeValue = 1.0, relativeFrame = 0) => {
    ctx.save();

    const transformOverrides = getTransformOverrides(clip, relativeFrame);

    // 変形パラメータ
    const baseScale = transformOverrides.scale ?? (clip.scale || 100) / 100;
    const baseOpacity = transformOverrides.opacity ?? (clip.opacity ?? 100) / 100;
    const rotation = (clip.rotation || 0) * Math.PI / 180;
    const posX = clip.positionX || 0;
    const posY = clip.positionY || 0;
    const fitMode = clip.fit || 'contain';

    // envelopeタイプに応じた適用
    const envelope = clip.envelope;
    const inType = envelope?.in?.type || 'none';
    const outType = envelope?.out?.type || 'none';

    // フェード: opacity に適用
    // スケール: scale に適用
    let opacity = baseOpacity;
    let scale = baseScale;

    if (inType === 'fade' || outType === 'fade') {
      opacity *= envelopeValue;
    }
    if (inType === 'scale' || outType === 'scale') {
      scale *= envelopeValue;
    }

    ctx.globalAlpha = opacity;

    // 中心を基準に変形
    const centerX = width / 2 + posX;
    const centerY = height / 2 + posY;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // メディアのサイズ計算
    const mediaWidth = media.videoWidth || media.naturalWidth || media.width;
    const mediaHeight = media.videoHeight || media.naturalHeight || media.height;

    if (mediaWidth && mediaHeight) {
      const aspectRatio = mediaWidth / mediaHeight;
      const canvasAspectRatio = width / height;

      let drawWidth, drawHeight;

      if (fitMode === 'none') {
        // 元のサイズをそのまま使用
        drawWidth = mediaWidth;
        drawHeight = mediaHeight;
      } else if (fitMode === 'cover') {
        // キャンバス全体をカバー（はみ出し許容）
        if (aspectRatio > canvasAspectRatio) {
          drawHeight = height;
          drawWidth = height * aspectRatio;
        } else {
          drawWidth = width;
          drawHeight = width / aspectRatio;
        }
      } else {
        // contain（デフォルト）: キャンバス内に収まるようにフィット
        if (aspectRatio > canvasAspectRatio) {
          drawWidth = width;
          drawHeight = width / aspectRatio;
        } else {
          drawHeight = height;
          drawWidth = height * aspectRatio;
        }
      }

      ctx.drawImage(media, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

    ctx.restore();
  };

  // フォールバック色（previewColorがない場合）
  const DEFAULT_OVERLAY_COLOR = '#888888';

  // previewColorオーバーレイを描画
  const drawPreviewOverlay = (ctx, clip, width, height) => {
    ctx.save();

    const scale = (clip.scale || 100) / 100;
    const posX = clip.positionX || 0;
    const posY = clip.positionY || 0;
    // previewColorがなければフォールバック色を使用
    const overlayColor = clip.previewColor || DEFAULT_OVERLAY_COLOR;

    // オーバーレイのサイズ（33%スケールの場合は1/3のサイズ）
    const overlayWidth = width * scale;
    const overlayHeight = height * scale;

    // 中心を基準に位置計算
    const centerX = width / 2 + posX;
    const centerY = height / 2 + posY;

    // 半透明の矩形を描画
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = overlayColor;
    ctx.fillRect(
      centerX - overlayWidth / 2,
      centerY - overlayHeight / 2,
      overlayWidth,
      overlayHeight
    );

    // 枠線を描画
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = overlayColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      centerX - overlayWidth / 2,
      centerY - overlayHeight / 2,
      overlayWidth,
      overlayHeight
    );

    // ラベルを描画（1行目: レイヤーID: クリップ名）
    ctx.globalAlpha = 1;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // ラベルテキスト（レイヤーID付き）
    const labelLine1 = `${clip.layerId}: ${clip.name || 'Clip'}`;
    // 2行目: 位置・スケール情報
    const labelLine2 = `pos(${posX}, ${posY}) scale:${Math.round(scale * 100)}%`;

    const labelPadding = 4;
    const lineHeight = 18;
    const labelMetrics1 = ctx.measureText(labelLine1);
    ctx.font = '12px sans-serif';
    const labelMetrics2 = ctx.measureText(labelLine2);
    const labelWidth = Math.max(labelMetrics1.width, labelMetrics2.width);

    const labelX = centerX - overlayWidth / 2 + 4;
    const labelY = centerY - overlayHeight / 2 + 4;

    // ラベル背景（2行分）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      labelX - labelPadding,
      labelY - labelPadding,
      labelWidth + labelPadding * 2,
      lineHeight * 2 + labelPadding * 2
    );

    // 1行目（レイヤーID: クリップ名）
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = overlayColor;
    ctx.fillText(labelLine1, labelX, labelY);

    // 2行目（位置・スケール情報）
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(labelLine2, labelX, labelY + lineHeight);

    ctx.restore();
  };

  // キャンバス描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // キャンバスをクリア（黒背景）
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const visibleClips = getVisibleClips();

    // クリップがない場合のプレースホルダー表示
    if (visibleClips.length === 0) {
      ctx.fillStyle = '#0b0d11';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#6b7387';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No clips at current frame', width / 2, height / 2);
      return;
    }

    // 各クリップを描画
    const renderClips = async () => {
      for (const clip of visibleClips) {
        const filePath = clip.filePath || clip.selectedFilePath;
        const relativeFrame = currentFrame - clip.startFrame;

        // envelope値を計算（random_layer用、他のタイプでも将来使用可能）
        const envelopeValue = calculateEnvelopeValue(clip, relativeFrame);

        if (clip.type === 'random_layer') {
          // ランダムレイヤー（ネスト型コンテナ）の描画
          // 現在のフレームに対応するセグメントを取得
          const currentSegment = getCurrentSegment(clip, relativeFrame);

          if (filePath) {
            // 旧形式または単一セグメント: filePathで直接描画
            try {
              const img = await loadImage(filePath);
              drawMedia(ctx, img, clip, width, height, envelopeValue, relativeFrame);
            } catch (e) {
              drawPlaceholder(ctx, clip, width, height, '#22C55E');
            }
          } else if (currentSegment) {
            // 新形式: セグメントに基づいて描画（プレースホルダー表示）
            // 実際のアセット選択はエクスポート時にrandomLayerSliceで行う
            drawPlaceholder(ctx, clip, width, height, '#22C55E');
          } else {
            // ギャップ期間: 何も描画しない
            continue;
          }
        } else if (clip.type === 'image') {
          // 画像クリップの描画
          try {
            const img = await loadImage(filePath);
            drawMedia(ctx, img, clip, width, height, envelopeValue, relativeFrame);
          } catch (e) {
            drawPlaceholder(ctx, clip, width, height, '#22C55E');
          }
        } else if (clip.type === 'video' && filePath) {
          // 動画クリップの描画
          try {
            const video = await getVideoElement(filePath);
            const timeInSeconds = relativeFrame / fps;
            await seekVideoToTime(video, timeInSeconds);
            drawMedia(ctx, video, clip, width, height, envelopeValue, relativeFrame);
          } catch (e) {
            drawPlaceholder(ctx, clip, width, height, '#3B82F6');
          }
        } else if (clip.type === 'text' || clip.type === 'variable_text' || clip.type === 'csv_text_placeholder') {
          // テキスト系クリップの描画
          drawTextClip(ctx, clip, width, height);
        } else if (clip.type === 'adjustment') {
          // 調整レイヤー（視覚的マーカーのみ）
          drawAdjustmentPlaceholder(ctx, clip, width, height);
        }
        // オーディオクリップ（bgm, se）は視覚的には表示しない

        // previewColorオーバーレイを描画（showOverlayがONの場合、previewColorがなくてもフォールバック色で表示）
        if (showOverlay) {
          drawPreviewOverlay(ctx, clip, width, height);
        }
      }

      // フレーム情報（デバッグ用、左上）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(8, 8, 120, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Frame: ${currentFrame}`, 12, 12);
    };

    renderClips();

  }, [layers, layerOrder, currentFrame, fps, mediaReady, getVisibleClips, showOverlay]);

  // テキストクリップを描画
  const drawTextClip = (ctx, clip, width, height) => {
    const text = renderVariableText(clip);
    const fontSize = clip.fontSize || 48;
    const fontFamily = clip.fontFamily || 'Hiragino Sans, sans-serif';
    const textColor = clip.textColor || '#FFFFFF';
    const bgColor = clip.bgColor || 'transparent';

    ctx.save();

    // 変形パラメータ
    const scale = (clip.scale || 100) / 100;
    const opacity = (clip.opacity ?? 100) / 100;
    const posX = clip.positionX || 0;
    const posY = clip.positionY || 0;

    ctx.globalAlpha = opacity;

    // 背景色
    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // テキスト描画
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.min(fontSize * scale, 200)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2 + posX, height / 2 + posY);

    ctx.restore();
  };

  // プレースホルダーを描画
  const drawPlaceholder = (ctx, clip, width, height, color) => {
    ctx.save();
    ctx.globalAlpha = (clip.opacity ?? 100) / 100;

    // 背景色
    ctx.fillStyle = color + '40';
    ctx.fillRect(0, 0, width, height);

    // クリップ名表示
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.name, width / 2, height / 2 - 20);

    // クリップタイプ表示
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(`[${clip.type.toUpperCase()}]`, width / 2, height / 2 + 20);

    ctx.restore();
  };

  // 調整レイヤーのプレースホルダー
  const drawAdjustmentPlaceholder = (ctx, clip, width, height) => {
    ctx.fillStyle = '#EC489930';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(10, 10, width - 20, height - 20);
    ctx.setLineDash([]);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.name, width / 2, height / 2);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full object-contain"
      />
      {/* オーバーレイ表示トグルボタン */}
      <button
        onClick={() => setShowOverlay(!showOverlay)}
        className={`absolute top-2 right-2 px-2 py-1 text-xs rounded transition-colors ${
          showOverlay
            ? 'bg-primary text-white'
            : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
        }`}
        title={showOverlay ? 'オーバーレイを非表示' : 'オーバーレイを表示'}
      >
        {showOverlay ? '🎨 ON' : '🎨 OFF'}
      </button>
    </div>
  );
}

export default PreviewCanvas;
