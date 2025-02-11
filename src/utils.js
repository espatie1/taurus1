// src/utils.js
function extractYouTubeId(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v') || url; // Если есть параметр v, возвращаем его, иначе оставляем как есть
    } catch (err) {
      return url; // Если не получается разобрать, возвращаем исходное значение
    }
  }
  module.exports = { extractYouTubeId };
  