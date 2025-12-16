/**
 * Media duration utility functions
 * Provides methods to get actual duration of video/audio files
 */

// Default durations (in seconds)
const DEFAULT_IMAGE_DURATION = 5; // 5 seconds for images
const DEFAULT_FALLBACK_DURATION = 3; // 3 seconds fallback for errors

/**
 * Get the duration of a media file using HTML5 media elements
 * @param {string} filePath - Path to the media file
 * @param {string} type - Asset type: 'video', 'audio', or 'image'
 * @returns {Promise<number>} Duration in seconds
 */
export const getMediaDuration = (filePath, type) => {
  return new Promise((resolve) => {
    // Images have a configurable default duration
    if (type === 'image') {
      resolve(DEFAULT_IMAGE_DURATION);
      return;
    }

    // For video and audio, use HTML5 elements to get actual duration
    const isVideo = type === 'video';
    const media = document.createElement(isVideo ? 'video' : 'audio');

    // Handle file path - add file:// protocol if needed
    let src = filePath;
    if (filePath && !filePath.startsWith('file://') && !filePath.startsWith('blob:') && !filePath.startsWith('http')) {
      src = `file://${filePath}`;
    }

    media.src = src;
    media.preload = 'metadata';

    let resolved = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      media.removeEventListener('loadedmetadata', onLoadedMetadata);
      media.removeEventListener('error', onError);
      media.src = '';
    };

    const safeResolve = (value) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(value);
      }
    };

    const onLoadedMetadata = () => {
      const duration = media.duration;
      // Check for valid duration (not NaN, not Infinity)
      if (isFinite(duration) && duration > 0) {
        safeResolve(duration);
      } else {
        safeResolve(DEFAULT_FALLBACK_DURATION);
      }
    };

    const onError = () => {
      console.warn(`Failed to load media metadata for: ${filePath}`);
      safeResolve(DEFAULT_FALLBACK_DURATION);
    };

    media.addEventListener('loadedmetadata', onLoadedMetadata);
    media.addEventListener('error', onError);

    // Timeout fallback (5 seconds)
    timeoutId = setTimeout(() => {
      console.warn(`Timeout loading media metadata for: ${filePath}`);
      safeResolve(DEFAULT_FALLBACK_DURATION);
    }, 5000);
  });
};

/**
 * Get the duration in frames
 * @param {string} filePath - Path to the media file
 * @param {string} type - Asset type: 'video', 'audio', or 'image'
 * @param {number} fps - Frames per second (default: 30)
 * @returns {Promise<number>} Duration in frames (rounded)
 */
export const getMediaDurationFrames = async (filePath, type, fps = 30) => {
  const durationSeconds = await getMediaDuration(filePath, type);
  return Math.round(durationSeconds * fps);
};

/**
 * Get durations for multiple files
 * @param {Array<{path: string, type: string}>} files - Array of file objects with path and type
 * @param {number} fps - Frames per second
 * @returns {Promise<Map<string, number>>} Map of file path to duration in frames
 */
export const getMediaDurationsForFiles = async (files, fps = 30) => {
  const results = new Map();

  await Promise.all(
    files.map(async (file) => {
      const durationFrames = await getMediaDurationFrames(file.path, file.type, fps);
      results.set(file.path, durationFrames);
    })
  );

  return results;
};

export default {
  getMediaDuration,
  getMediaDurationFrames,
  getMediaDurationsForFiles,
  DEFAULT_IMAGE_DURATION,
  DEFAULT_FALLBACK_DURATION,
};
