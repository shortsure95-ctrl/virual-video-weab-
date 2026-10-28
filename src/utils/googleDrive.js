/**
 * Google Drive, YouTube, and Direct Video URL processor
 */

export function parseVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      type: 'unknown',
      embedUrl: '',
      directUrl: ''
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Google Drive Links
  // Patterns:
  // - https://drive.google.com/file/d/FILE_ID/view...
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://drive.google.com/file/d/FILE_ID/preview
  const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveIdRegex = /drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_-]+)/;

  const matchFile = trimmed.match(driveFileRegex);
  const matchId = trimmed.match(driveIdRegex);
  const driveId = (matchFile && matchFile[1]) || (matchId && matchId[1]);

  if (driveId) {
    return {
      type: 'drive',
      id: driveId,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      directUrl: `https://drive.google.com/file/d/${driveId}/view?usp=sharing`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
      isDrive: true
    };
  }

  // 2. YouTube Links
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      id: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
      directUrl: trimmed,
      isDrive: false
    };
  }

  // 3. Direct video format (.mp4, .webm, etc.) or generic external embed
  const isDirectFile = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed);
  return {
    type: isDirectFile ? 'direct_video' : 'external',
    embedUrl: trimmed,
    directUrl: trimmed,
    isDrive: false
  };
}

/**
 * If the user uploads a thumbnail image to Google Drive and pastes its share link,
 * auto-convert it to a direct image endpoint that browsers can render in <img> tags.
 */
export function parseThumbnailUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveIdRegex = /drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_-]+)/;

  const matchFile = trimmed.match(driveFileRegex);
  const matchId = trimmed.match(driveIdRegex);
  const driveId = (matchFile && matchFile[1]) || (matchId && matchId[1]);

  if (driveId) {
    // lh3.googleusercontent.com/d/FILE_ID serves direct images from Google Drive
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return trimmed;
}
