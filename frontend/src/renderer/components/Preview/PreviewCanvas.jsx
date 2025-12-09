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

  // メディアを描画（変形適用）
  const drawMedia = (ctx, media, clip, width, height) => {
    ctx.save();

    // 変形パラメータ
    const scale = (clip.scale || 100) / 100;
    const opacity = (clip.opacity ?? 100) / 100;
    const rotation = (clip.rotation || 0) * Math.PI / 180;
    const posX = clip.positionX || 0;
    const posY = clip.positionY || 0;

    ctx.globalAlpha = opacity;

    // 中心を基準に変形
    const centerX = width / 2 + posX;
    const centerY = height / 2 + posY;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // メディアのサイズ計算（アスペクト比を保持してフィット）
    const mediaWidth = media.videoWidth || media.naturalWidth || media.width;
    const mediaHeight = media.videoHeight || media.naturalHeight || media.height;

    if (mediaWidth && mediaHeight) {
      const aspectRatio = mediaWidth / mediaHeight;
      const canvasAspectRatio = width / height;

      let drawWidth, drawHeight;

      if (aspectRatio > canvasAspectRatio) {
        // 横長のメディア
        drawWidth = width;
        drawHeight = width / aspectRatio;
      } else {
        // 縦長のメディア
        drawHeight = height;
        drawWidth = height * aspectRatio;
      }

      ctx.drawImage(media, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

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

        if (clip.type === 'image' || (clip.type === 'random_layer' && filePath)) {
          // 画像クリップの描画
          try {
            const img = await loadImage(filePath);
            drawMedia(ctx, img, clip, width, height);
          } catch (e) {
            // 画像が読み込めない場合はプレースホルダー
            drawPlaceholder(ctx, clip, width, height, '#22C55E');
          }
        } else if (clip.type === 'video' && filePath) {
          // 動画クリップの描画
          try {
            const video = await getVideoElement(filePath);
            // クリップ内の相対フレームから時間を計算
            const relativeFrame = currentFrame - clip.startFrame;
            const timeInSeconds = relativeFrame / fps;
            await seekVideoToTime(video, timeInSeconds);
            drawMedia(ctx, video, clip, width, height);
          } catch (e) {
            // 動画が読み込めない場合はプレースホルダー
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

  }, [layers, layerOrder, currentFrame, fps, mediaReady, getVisibleClips]);

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
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="w-full h-full object-contain"
    />
  );
}

export default PreviewCanvas;
