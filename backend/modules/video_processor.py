"""
VideoProcessor - 動画処理クラス
動画の読み込み・編集・書き出しを行う
"""

from typing import Optional, List, Dict, Callable, Any
import os
import threading
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

try:
    from moviepy.editor import (
        VideoFileClip,
        ImageClip,
        AudioFileClip,
        CompositeVideoClip,
        CompositeAudioClip,
        ColorClip,
        concatenate_videoclips
    )
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    print("Warning: MoviePy not available. Video rendering will not work.")

# ランダムレイヤーモジュールのインポート
try:
    from .random_layer import get_handler as get_random_handler
    RANDOM_LAYER_AVAILABLE = True
except ImportError:
    RANDOM_LAYER_AVAILABLE = False
    print("Warning: RandomLayerHandler not available.")

# 可変テキストモジュールのインポート
try:
    from .variable_text import get_handler as get_variable_text_handler
    VARIABLE_TEXT_AVAILABLE = True
except ImportError:
    VARIABLE_TEXT_AVAILABLE = False
    print("Warning: VariableTextHandler not available.")

# 調整レイヤーモジュールのインポート
try:
    from .adjustment_layer import get_handler as get_adjustment_handler
    ADJUSTMENT_LAYER_AVAILABLE = True
except ImportError:
    ADJUSTMENT_LAYER_AVAILABLE = False
    print("Warning: AdjustmentLayerHandler not available.")

# トランジションモジュールのインポート
try:
    from .effects.transition import get_handler as get_transition_handler
    TRANSITION_AVAILABLE = True
except ImportError:
    TRANSITION_AVAILABLE = False
    print("Warning: TransitionHandler not available.")

# クリップエフェクトモジュールのインポート
try:
    from .effects.clip_effects import apply_effects as apply_clip_effects
    CLIP_EFFECTS_AVAILABLE = True
except ImportError:
    CLIP_EFFECTS_AVAILABLE = False
    print("Warning: ClipEffects not available.")


class VideoProcessor:
    """動画処理を行うメインクラス"""

    def __init__(self):
        """初期化"""
        self.video_clip = None
        self.input_path = None
        self.output_path = None
        self.fps = None
        self.duration = None
        self.resolution = None

        # レンダリング制御用
        self._cancel_flag = False
        self._render_thread = None
        self._progress = {
            'current_frame': 0,
            'total_frames': 0,
            'percentage': 0.0,
            'status': 'idle'
        }
        self._progress_lock = threading.Lock()

    def load_video(self, input_path: str) -> bool:
        """
        動画ファイルを読み込む

        Args:
            input_path (str): 入力動画ファイルパス

        Returns:
            bool: 成功時True、失敗時False
        """
        try:
            if not MOVIEPY_AVAILABLE:
                raise ImportError("MoviePy is not installed")

            if not os.path.exists(input_path):
                raise FileNotFoundError(f"動画ファイルが見つかりません: {input_path}")

            self.video_clip = VideoFileClip(input_path)
            self.input_path = input_path

            # 動画情報の取得
            self.fps = self.video_clip.fps
            self.duration = self.video_clip.duration
            self.resolution = self.video_clip.size

            print(f"動画読み込み: {input_path}")
            print(f"  FPS: {self.fps}, Duration: {self.duration}s, Resolution: {self.resolution}")

            return True

        except Exception as e:
            print(f"動画読み込みエラー: {e}")
            return False

    def render(
        self,
        timeline_data: Dict[str, Any],
        output_path: str,
        options: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        タイムラインデータから動画を生成

        Args:
            timeline_data: タイムラインデータ
            output_path: 出力ファイルパス
            options: レンダリングオプション
            progress_callback: 進捗コールバック関数

        Returns:
            bool: 成功時True、失敗時False
        """
        try:
            if not MOVIEPY_AVAILABLE:
                raise ImportError("MoviePy is not installed")

            # デフォルトオプション
            default_options = {
                'codec': 'libx264',
                'audio_codec': 'aac',
                'preset': 'medium',
                'fps': timeline_data.get('fps', 30),
                'threads': 4,
                'bitrate': '5000k'
            }

            if options:
                default_options.update(options)

            render_options = default_options

            # 進捗状態の初期化
            total_frames = timeline_data.get('totalFrames', 0)
            with self._progress_lock:
                self._progress = {
                    'current_frame': 0,
                    'total_frames': total_frames,
                    'percentage': 0.0,
                    'status': 'rendering'
                }
            self._cancel_flag = False

            # タイムラインデータの解析
            fps = timeline_data.get('fps', 30)
            duration = total_frames / fps
            layers = timeline_data.get('layers', {})
            layer_order = timeline_data.get('layerOrder', [])

            print(f"レンダリング開始: {output_path}")
            print(f"  FPS: {fps}, Duration: {duration}s, Total Frames: {total_frames}")
            print(f"  Layers: {len(layers)}, Order: {layer_order}")

            # レイヤー別にクリップを準備
            video_clips = []
            audio_clips = []

            # ビデオレイヤーの処理（V2, V1など、逆順で処理して重ね順を正しくする）
            video_layer_names = [name for name in layer_order if name.startswith('V')]
            for layer_name in video_layer_names:
                layer = layers.get(layer_name, {})
                clips = layer.get('clips', [])

                for clip_data in clips:
                    if self._cancel_flag:
                        raise Exception("レンダリングがキャンセルされました")

                    clip = self._create_video_clip(clip_data, fps)
                    if clip:
                        video_clips.append(clip)

            # オーディオレイヤーの処理（S2, S1など）
            audio_layer_names = [name for name in layer_order if name.startswith('S')]
            for layer_name in audio_layer_names:
                layer = layers.get(layer_name, {})
                clips = layer.get('clips', [])

                for clip_data in clips:
                    if self._cancel_flag:
                        raise Exception("レンダリングがキャンセルされました")

                    clip = self._create_audio_clip(clip_data, fps=fps, video_duration=duration)
                    if clip:
                        audio_clips.append(clip)

            # 動画が空の場合は黒背景を作成
            if not video_clips:
                print("警告: ビデオクリップがありません。黒背景を生成します。")
                resolution = render_options.get('resolution', (1920, 1080))
                video_clips.append(ColorClip(size=resolution, color=(0, 0, 0), duration=duration))

            # ビデオクリップの合成
            if len(video_clips) == 1:
                final_video = video_clips[0]
            else:
                final_video = CompositeVideoClip(video_clips, size=render_options.get('resolution', (1920, 1080)))

            final_video = final_video.set_duration(duration).set_fps(fps)

            # オーディオの合成
            if audio_clips:
                composite_audio = CompositeAudioClip(audio_clips)
                final_video = final_video.set_audio(composite_audio)

            # 出力ディレクトリの作成
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)

            # 進捗コールバックラッパー
            def write_progress_callback(t):
                """MoviePyの進捗コールバック"""
                if self._cancel_flag:
                    raise Exception("レンダリングがキャンセルされました")

                current_frame = int(t * fps)
                percentage = (current_frame / total_frames * 100) if total_frames > 0 else 0

                with self._progress_lock:
                    self._progress['current_frame'] = current_frame
                    self._progress['percentage'] = percentage

                if progress_callback:
                    progress_callback({
                        'current_frame': current_frame,
                        'total_frames': total_frames,
                        'percentage': percentage,
                        'status': 'rendering'
                    })

            # 動画の書き出し
            final_video.write_videofile(
                output_path,
                codec=render_options['codec'],
                audio_codec=render_options['audio_codec'],
                preset=render_options['preset'],
                fps=fps,
                threads=render_options['threads'],
                bitrate=render_options['bitrate'],
                logger=None,  # 標準のログ出力を抑制
                progress_bar=False,  # プログレスバーを無効化
            )

            # レンダリング完了
            with self._progress_lock:
                self._progress['status'] = 'completed'
                self._progress['percentage'] = 100.0

            if progress_callback:
                progress_callback({
                    'current_frame': total_frames,
                    'total_frames': total_frames,
                    'percentage': 100.0,
                    'status': 'completed'
                })

            # リソース解放
            final_video.close()
            for clip in video_clips:
                clip.close()
            for clip in audio_clips:
                clip.close()

            print(f"レンダリング完了: {output_path}")
            return True

        except Exception as e:
            with self._progress_lock:
                self._progress['status'] = 'error'

            if progress_callback:
                progress_callback({
                    'current_frame': 0,
                    'total_frames': 0,
                    'percentage': 0.0,
                    'status': 'error',
                    'error': str(e)
                })

            print(f"レンダリングエラー: {e}")
            return False

    def _create_video_clip(self, clip_data: Dict[str, Any], fps: float):
        """
        ビデオクリップを作成

        Args:
            clip_data: クリップデータ
            fps: フレームレート

        Returns:
            MoviePy clip object or None
        """
        try:
            clip_type = clip_data.get('type')
            start_frame = clip_data.get('startFrame', 0)
            end_frame = clip_data.get('endFrame', 0)
            duration = (end_frame - start_frame) / fps
            start_time = start_frame / fps

            clip = None

            # クリップタイプ別の処理
            if clip_type == 'video':
                file_path = clip_data.get('filePath')
                if file_path and os.path.exists(file_path):
                    video_clip = VideoFileClip(file_path)

                    # イン点・アウト点の処理
                    in_point = clip_data.get('inPoint', 0) / fps
                    out_point = clip_data.get('outPoint', video_clip.duration * fps) / fps

                    clip = video_clip.subclip(in_point, min(out_point, video_clip.duration))
                    clip = clip.set_duration(duration)

            elif clip_type == 'image':
                file_path = clip_data.get('filePath')
                if file_path and os.path.exists(file_path):
                    clip = ImageClip(file_path, duration=duration)

            elif clip_type == 'text':
                # PIL/Pillowでテキスト画像を生成
                text = clip_data.get('textContent', 'Sample Text')
                font_size = clip_data.get('fontSize', 48)
                text_color = clip_data.get('textColor', '#ffffff')
                bg_color = clip_data.get('bgColor', '#000000')
                resolution = clip_data.get('resolution', (1920, 1080))

                # テキスト画像の生成
                text_image = self._create_text_image(text, font_size, text_color, bg_color, resolution)
                clip = ImageClip(text_image, duration=duration)

                # アニメーションの適用
                animation = clip_data.get('animation')
                if animation and animation.get('type') != 'none':
                    clip = self._apply_text_animation(clip, animation, fps)

            elif clip_type == 'random_layer':
                # ランダムレイヤー: フォルダからメディアをランダム選択
                if RANDOM_LAYER_AVAILABLE:
                    from .random_layer import is_video_file, is_image_file, is_gif_file

                    handler = get_random_handler()
                    selected_file = handler.select_media(clip_data)

                    if selected_file and os.path.exists(selected_file):
                        if is_gif_file(selected_file):
                            # GIFファイルの場合: アニメーションGIFを試行し、失敗したら静止画にフォールバック
                            try:
                                # アニメーションGIFはVideoFileClipで読み込み
                                video_clip = VideoFileClip(selected_file)

                                # 動画の長さがクリップより短い場合はループ
                                if video_clip.duration < duration:
                                    num_loops = int(math.ceil(duration / video_clip.duration))
                                    clips_to_concat = [video_clip] * num_loops
                                    video_clip = concatenate_videoclips(clips_to_concat)

                                clip = video_clip.subclip(0, min(duration, video_clip.duration))
                                clip = clip.set_duration(duration)

                            except Exception as e:
                                # 静止GIFまたは読み込み失敗の場合はImageClipにフォールバック
                                print(f"GIFをVideoClipとして読み込めませんでした。ImageClipとして処理します: {e}")
                                clip = ImageClip(selected_file, duration=duration)

                        elif is_video_file(selected_file):
                            # 動画ファイルの場合
                            video_clip = VideoFileClip(selected_file)

                            # 動画の長さがクリップより短い場合はループ
                            if video_clip.duration < duration:
                                num_loops = int(math.ceil(duration / video_clip.duration))
                                clips_to_concat = [video_clip] * num_loops
                                video_clip = concatenate_videoclips(clips_to_concat)

                            clip = video_clip.subclip(0, min(duration, video_clip.duration))
                            clip = clip.set_duration(duration)

                        elif is_image_file(selected_file):
                            # 画像ファイルの場合
                            clip = ImageClip(selected_file, duration=duration)

                        else:
                            print(f"警告: 未対応のファイル形式: {selected_file}")
                    else:
                        print(f"警告: ランダムレイヤーのファイルが見つかりません: {selected_file}")
                else:
                    print("警告: RandomLayerHandlerが利用できません")

            elif clip_type == 'variable_text':
                # 可変テキスト: CSVからテキストを取得して表示
                if VARIABLE_TEXT_AVAILABLE:
                    handler = get_variable_text_handler()
                    text = handler.get_text_from_clip(clip_data)

                    if text is None:
                        text = clip_data.get('textContent', 'Variable Text')

                    font_size = clip_data.get('fontSize', 48)
                    text_color = clip_data.get('textColor', '#ffffff')
                    bg_color = clip_data.get('bgColor', '#000000')
                    resolution = clip_data.get('resolution', (1920, 1080))

                    # テキスト画像の生成
                    text_image = self._create_text_image(text, font_size, text_color, bg_color, resolution)
                    clip = ImageClip(text_image, duration=duration)

                    # アニメーションの適用
                    animation = clip_data.get('animation')
                    if animation and animation.get('type') != 'none':
                        clip = self._apply_text_animation(clip, animation, fps)
                else:
                    print("警告: VariableTextHandlerが利用できません")

            elif clip_type == 'adjustment':
                # 調整レイヤー: エフェクトを適用（透明クリップとして作成）
                if ADJUSTMENT_LAYER_AVAILABLE:
                    handler = get_adjustment_handler()
                    resolution = clip_data.get('resolution', (1920, 1080))

                    # 調整レイヤーは透明なクリップとして作成
                    clip = handler.create_adjustment_layer(clip_data, duration, resolution)

                    # 注意: 実際のエフェクト適用はCompositeVideoClip時に
                    # 下のレイヤーに対して行う必要がある（別途実装）
                else:
                    print("警告: AdjustmentLayerHandlerが利用できません")

            # トランジションの適用（オプション）
            if clip and TRANSITION_AVAILABLE:
                clip = self._apply_transitions(clip, clip_data, fps)

            # エフェクトの適用（オプション）
            if clip and CLIP_EFFECTS_AVAILABLE:
                clip = self._apply_effects(clip, clip_data, fps)

            # プロパティの適用
            if clip:
                clip = self._apply_clip_properties(clip, clip_data, start_time)

            return clip

        except Exception as e:
            print(f"ビデオクリップ作成エラー: {e}")
            return None

    def _create_audio_clip(self, clip_data: Dict[str, Any], fps: float = 30, video_duration: float = None):
        """
        オーディオクリップを作成

        Args:
            clip_data: クリップデータ
            fps: フレームレート
            video_duration: 動画の総尺（ループ用）

        Returns:
            MoviePy audio clip object or None
        """
        try:
            file_path = clip_data.get('filePath')
            if not file_path or not os.path.exists(file_path):
                return None

            audio_clip = AudioFileClip(file_path)

            # イン点・アウト点の処理
            in_point = clip_data.get('inPoint', 0)
            out_point = clip_data.get('outPoint', audio_clip.duration)

            if in_point > 0 or out_point < audio_clip.duration:
                audio_clip = audio_clip.subclip(in_point, min(out_point, audio_clip.duration))

            # ループ処理（BGMのみ）
            clip_type = clip_data.get('type')
            loop_enabled = clip_data.get('loop', False)

            if clip_type == 'bgm' and loop_enabled and video_duration:
                # クリップの開始時間と期待される長さを計算
                start_frame = clip_data.get('startFrame', 0)
                start_time = start_frame / fps
                required_duration = video_duration - start_time

                # オーディオが必要な長さより短い場合はループ
                if audio_clip.duration < required_duration:
                    # ループ回数を計算
                    num_loops = int(math.ceil(required_duration / audio_clip.duration))

                    # 複数回繰り返してから必要な長さにカット
                    from moviepy.audio.fx import audio_loop
                    audio_clip = audio_loop.audio_loop(audio_clip, n=num_loops)
                    audio_clip = audio_clip.set_duration(required_duration)

            # 開始時間の設定
            start_time = clip_data.get('startFrame', 0) / fps
            audio_clip = audio_clip.set_start(start_time)

            # ボリューム調整（パーセンテージ → 倍率変換）
            volume = clip_data.get('volume', 100) / 100.0
            if volume != 1.0:
                audio_clip = audio_clip.volumex(volume)

            # フェードイン/アウト（新フォーマット対応）
            fade_in_data = clip_data.get('fade_in', {})
            fade_out_data = clip_data.get('fade_out', {})

            # 新フォーマット（fade_in/fade_out オブジェクト）
            if isinstance(fade_in_data, dict) and fade_in_data.get('enabled', False):
                fade_in_duration = fade_in_data.get('duration_sec', 0)
                if fade_in_duration > 0:
                    audio_clip = audio_clip.audio_fadein(fade_in_duration)

            if isinstance(fade_out_data, dict) and fade_out_data.get('enabled', False):
                fade_out_duration = fade_out_data.get('duration_sec', 0)
                if fade_out_duration > 0:
                    audio_clip = audio_clip.audio_fadeout(fade_out_duration)

            # 旧フォーマット（fadeIn/fadeOut 数値）の後方互換性
            fade_in_legacy = clip_data.get('fadeIn', 0)
            fade_out_legacy = clip_data.get('fadeOut', 0)

            if not isinstance(fade_in_data, dict) and fade_in_legacy > 0:
                audio_clip = audio_clip.audio_fadein(fade_in_legacy)
            if not isinstance(fade_out_data, dict) and fade_out_legacy > 0:
                audio_clip = audio_clip.audio_fadeout(fade_out_legacy)

            return audio_clip

        except Exception as e:
            print(f"オーディオクリップ作成エラー: {e}")
            return None

    def _apply_clip_properties(self, clip, clip_data: Dict[str, Any], start_time: float):
        """
        クリップにプロパティを適用

        Args:
            clip: MoviePy clip object
            clip_data: クリップデータ
            start_time: 開始時間

        Returns:
            Modified clip object
        """
        # 位置
        position_x = clip_data.get('positionX', 0)
        position_y = clip_data.get('positionY', 0)
        clip = clip.set_position((position_x, position_y))

        # スケール
        scale = clip_data.get('scale', 1.0)
        if scale != 1.0:
            clip = clip.resize(scale)

        # 回転
        rotation = clip_data.get('rotation', 0)
        if rotation != 0:
            clip = clip.rotate(rotation)

        # 不透明度
        opacity = clip_data.get('opacity', 1.0)
        if opacity != 1.0:
            clip = clip.set_opacity(opacity)

        # 開始時間
        clip = clip.set_start(start_time)

        return clip

    def _apply_transitions(self, clip, clip_data: Dict[str, Any], fps: float):
        """
        クリップにトランジションを適用

        Args:
            clip: MoviePy clip object
            clip_data: クリップデータ（transition_in/transition_out を含む場合あり）
            fps: フレームレート

        Returns:
            Modified clip object
        """
        if clip is None:
            return None

        try:
            handler = get_transition_handler()

            # transition_in の適用
            transition_in = clip_data.get('transition_in')
            if transition_in and isinstance(transition_in, dict):
                transition_type = transition_in.get('type')
                duration_frames = transition_in.get('duration_frames', 15)
                easing = transition_in.get('easing', 'linear')

                if transition_type:
                    clip = handler.apply_transition(
                        clip,
                        transition_type,
                        duration_frames,
                        fps,
                        position='in',
                        easing=easing
                    )

            # transition_out の適用
            transition_out = clip_data.get('transition_out')
            if transition_out and isinstance(transition_out, dict):
                transition_type = transition_out.get('type')
                duration_frames = transition_out.get('duration_frames', 15)
                easing = transition_out.get('easing', 'linear')

                if transition_type:
                    clip = handler.apply_transition(
                        clip,
                        transition_type,
                        duration_frames,
                        fps,
                        position='out',
                        easing=easing
                    )

            return clip

        except Exception as e:
            print(f"トランジション適用エラー: {e}")
            return clip

    def _apply_effects(self, clip, clip_data: Dict[str, Any], fps: float):
        """
        クリップにエフェクトを適用

        Args:
            clip: MoviePy clip object
            clip_data: クリップデータ（effects リストを含む場合あり）
            fps: フレームレート

        Returns:
            Modified clip object
        """
        if clip is None:
            return None

        effects = clip_data.get('effects')
        if not effects or not isinstance(effects, list):
            return clip

        try:
            clip = apply_clip_effects(clip, effects, fps)
            return clip

        except Exception as e:
            print(f"エフェクト適用エラー: {e}")
            return clip

    def _create_text_image(
        self,
        text: str,
        font_size: int,
        text_color: str,
        bg_color: str,
        resolution: tuple
    ) -> np.ndarray:
        """
        PIL/Pillowでテキスト画像を生成

        Args:
            text: テキスト
            font_size: フォントサイズ
            text_color: テキストカラー（hex形式）
            bg_color: 背景カラー（hex形式）
            resolution: 解像度

        Returns:
            numpy array (RGBA)
        """
        # 背景色をRGBAに変換
        bg_rgba = self._hex_to_rgba(bg_color, alpha=0)  # 透明背景

        # 画像の作成
        img = Image.new('RGBA', resolution, bg_rgba)
        draw = ImageDraw.Draw(img)

        # フォントの読み込み（システムフォントを使用）
        try:
            # macOSの場合
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            try:
                # Linuxの場合
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except:
                # デフォルトフォント
                font = ImageFont.load_default()

        # テキストのサイズを取得
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # 中央に配置
        x = (resolution[0] - text_width) // 2
        y = (resolution[1] - text_height) // 2

        # テキストカラーをRGBAに変換
        text_rgba = self._hex_to_rgba(text_color, alpha=255)

        # テキストを描画
        draw.text((x, y), text, font=font, fill=text_rgba)

        # numpy配列に変換
        return np.array(img)

    def _hex_to_rgba(self, hex_color: str, alpha: int = 255) -> tuple:
        """
        HEXカラーコードをRGBAタプルに変換

        Args:
            hex_color: HEXカラーコード（例: '#ffffff'）
            alpha: アルファ値（0-255）

        Returns:
            (R, G, B, A) タプル
        """
        # '#'を削除
        hex_color = hex_color.lstrip('#')

        # RGBに変換
        if len(hex_color) == 6:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
        else:
            # デフォルトは白
            r, g, b = 255, 255, 255

        return (r, g, b, alpha)

    def _apply_text_animation(self, clip, animation: Dict[str, Any], fps: float):
        """
        テキストクリップにアニメーションを適用

        Args:
            clip: MoviePy clip object
            animation: アニメーション設定 {"type": "fade_in"|"slide_in", "duration_frames": int}
            fps: フレームレート

        Returns:
            Modified clip object
        """
        animation_type = animation.get('type', 'none')
        duration_frames = animation.get('duration_frames', 15)
        animation_duration = duration_frames / fps

        if animation_type == 'fade_in':
            # フェードインアニメーション
            def opacity_func(t):
                if t < animation_duration:
                    return t / animation_duration
                return 1.0

            clip = clip.set_opacity(opacity_func)

        elif animation_type == 'slide_in':
            # スライドインアニメーション（下から上へ）
            original_pos = clip.pos if hasattr(clip, 'pos') and clip.pos else (0, 0)

            def position_func(t):
                if t < animation_duration:
                    # アニメーション中: 下から上へスライド
                    progress = t / animation_duration
                    # イージング関数（ease-out）
                    eased_progress = 1 - (1 - progress) ** 2
                    offset_y = 100 * (1 - eased_progress)  # 下から100px上へ
                    return (original_pos[0], original_pos[1] + offset_y)
                return original_pos

            clip = clip.set_position(position_func)

        return clip

    def cancel(self):
        """レンダリングを中断"""
        self._cancel_flag = True
        with self._progress_lock:
            self._progress['status'] = 'cancelled'
        print("レンダリングのキャンセルが要求されました")

    def get_progress(self) -> Dict[str, Any]:
        """
        進捗を取得

        Returns:
            dict: 進捗情報
        """
        with self._progress_lock:
            return self._progress.copy()

    def export_video(self, output_path: str, codec: str = "libx264") -> bool:
        """
        動画を書き出す

        Args:
            output_path (str): 出力動画ファイルパス
            codec (str): 動画コーデック（デフォルト: libx264）

        Returns:
            bool: 書き出し成功時True、失敗時False
        """
        try:
            if not MOVIEPY_AVAILABLE:
                raise ImportError("MoviePy is not installed")

            if self.video_clip is None:
                raise ValueError("動画が読み込まれていません")

            # 出力ディレクトリの作成
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)

            self.video_clip.write_videofile(
                output_path,
                codec=codec,
                audio_codec='aac'
            )

            self.output_path = output_path
            print(f"動画書き出し: {output_path}")

            return True

        except Exception as e:
            print(f"動画書き出しエラー: {e}")
            return False

    def cut_video(self, start_time: float, end_time: float) -> bool:
        """
        動画を指定範囲でカット

        Args:
            start_time (float): 開始時間（秒）
            end_time (float): 終了時間（秒）

        Returns:
            bool: カット成功時True、失敗時False
        """
        try:
            if not MOVIEPY_AVAILABLE:
                raise ImportError("MoviePy is not installed")

            if self.video_clip is None:
                raise ValueError("動画が読み込まれていません")

            self.video_clip = self.video_clip.subclip(start_time, end_time)

            print(f"動画カット: {start_time}秒 - {end_time}秒")
            return True

        except Exception as e:
            print(f"動画カットエラー: {e}")
            return False

    def concatenate_videos(self, video_paths: List[str]) -> bool:
        """
        複数の動画を連結

        Args:
            video_paths (List[str]): 連結する動画ファイルパスのリスト

        Returns:
            bool: 連結成功時True、失敗時False
        """
        try:
            if not MOVIEPY_AVAILABLE:
                raise ImportError("MoviePy is not installed")

            clips = [VideoFileClip(path) for path in video_paths]
            self.video_clip = concatenate_videoclips(clips)

            print(f"動画連結: {len(video_paths)}本のファイル")
            return True

        except Exception as e:
            print(f"動画連結エラー: {e}")
            return False

    def get_video_info(self) -> Optional[dict]:
        """
        動画情報を取得

        Returns:
            dict: 動画情報（fps, duration, resolution等）
            None: 動画が読み込まれていない場合
        """
        if self.video_clip is None:
            return None

        return {
            "input_path": self.input_path,
            "fps": self.fps,
            "duration": self.duration,
            "resolution": self.resolution
        }

    def close(self):
        """リソースを解放"""
        if self.video_clip is not None:
            self.video_clip.close()
            self.video_clip = None
            print("動画リソースを解放しました")

    def __enter__(self):
        """コンテキストマネージャー: with文の開始"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャー: リソース解放"""
        self.close()
