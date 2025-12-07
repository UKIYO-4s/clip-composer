import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

/**
 * PreviewCanvas - Canvas要素でフレームを描画
 * 複数レイヤーの合成表示、テキストクリップのレンダリング
 */
function PreviewCanvas() {
  const canvasRef = useRef(null);
  const { layers, layerOrder, currentFrame } = useSelector((state) => state.timeline);

  // 現在フレームで表示すべきクリップを取得
  const getVisibleClips = () => {
    const visibleClips = [];

    // レイヤー順序を逆順（下のレイヤーから上へ）で処理
    [...layerOrder].reverse().forEach((layerId) => {
      const layer = layers[layerId];
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
  };

  // クリップタイプごとの色
  const getClipColor = (type) => {
    const colorMap = {
      video: '#3B82F6', // blue-500
      text: '#EAB308', // yellow-500
      image: '#22C55E', // green-500
      bgm: '#A855F7', // purple-500
      se: '#06B6D4', // cyan-500
      adjustment: '#EC4899', // pink-500
    };
    return colorMap[type] || '#6B7280';
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
      // 背景: bg-surface-sunken
      ctx.fillStyle = '#0b0d11';
      ctx.fillRect(0, 0, width, height);

      // テキスト: text-ink-muted
      ctx.fillStyle = '#6b7387';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      ctx.fillText('No clips at current frame', width / 2, height / 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      return;
    }

    // 各クリップを描画
    visibleClips.forEach((clip) => {
      if (clip.type === 'text') {
        // テキストクリップの描画
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(clip.name, width / 2, height / 2);
      } else if (clip.type === 'video' || clip.type === 'image') {
        // 動画/画像クリップのプレースホルダー描画
        const color = getClipColor(clip.type);

        // 背景色
        ctx.fillStyle = color + '40'; // 透明度25%
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
      } else if (clip.type === 'adjustment') {
        // 調整レイヤーのプレースホルダー
        ctx.fillStyle = getClipColor(clip.type) + '30';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = getClipColor(clip.type);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(clip.name, width / 2, height / 2);
      }
      // オーディオクリップ（bgm, se）は視覚的には表示しない
    });

    // フレーム情報（デバッグ用、左上）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(8, 8, 120, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Frame: ${currentFrame}`, 12, 12);

  }, [layers, layerOrder, currentFrame]);

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      className="w-full h-full object-contain"
    />
  );
}

export default PreviewCanvas;
