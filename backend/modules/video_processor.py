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

                    clip = self._create_audio_clip(clip_data)
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
                text = clip_data.get('text', 'Sample Text')
                font_size = clip_data.get('fontSize', 48)
                color = clip_data.get('color', 'white')
                resolution = clip_data.get('resolution', (1920, 1080))

                # テキスト画像の生成
                text_image = self._create_text_image(text, font_size, color, resolution)
                clip = ImageClip(text_image, duration=duration)

            # プロパティの適用
            if clip:
                clip = self._apply_clip_properties(clip, clip_data, start_time)

            return clip

        except Exception as e:
            print(f"ビデオクリップ作成エラー: {e}")
            return None

    def _create_audio_clip(self, clip_data: Dict[str, Any]):
        """
        オーディオクリップを作成

        Args:
            clip_data: クリップデータ

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

            # 開始時間の設定
            start_time = clip_data.get('startFrame', 0) / clip_data.get('fps', 30)
            audio_clip = audio_clip.set_start(start_time)

            # ボリューム調整
            volume = clip_data.get('volume', 1.0)
            if volume != 1.0:
                audio_clip = audio_clip.volumex(volume)

            # フェードイン/アウト
            fade_in = clip_data.get('fadeIn', 0)
            fade_out = clip_data.get('fadeOut', 0)

            if fade_in > 0:
                audio_clip = audio_clip.audio_fadein(fade_in)
            if fade_out > 0:
                audio_clip = audio_clip.audio_fadeout(fade_out)

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

    def _create_text_image(
        self,
        text: str,
        font_size: int,
        color: str,
        resolution: tuple
    ) -> np.ndarray:
        """
        PIL/Pillowでテキスト画像を生成

        Args:
            text: テキスト
            font_size: フォントサイズ
            color: テキストカラー
            resolution: 解像度

        Returns:
            numpy array (RGB)
        """
        # 画像の作成
        img = Image.new('RGBA', resolution, (0, 0, 0, 0))
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

        # カラー変換
        color_map = {
            'white': (255, 255, 255),
            'black': (0, 0, 0),
            'red': (255, 0, 0),
            'green': (0, 255, 0),
            'blue': (0, 0, 255),
        }
        rgb_color = color_map.get(color.lower(), (255, 255, 255))

        # テキストを描画
        draw.text((x, y), text, font=font, fill=rgb_color)

        # numpy配列に変換
        return np.array(img)

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
