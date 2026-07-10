export async function translatePhrasesBatch(phrases, onProgress) {
  if (phrases.length === 0) return {};

  const batchSize = 35; // Safe chunk size to avoid URL length limit
  const translations = {};

  for (let i = 0; i < phrases.length; i += batchSize) {
    const batch = phrases.slice(i, i + batchSize);

    if (onProgress) {
      onProgress(i, phrases.length);
    }

    const textToTranslate = batch.join('\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(textToTranslate)}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        data[0].forEach(item => {
          if (item && item[0] && item[1]) {
            const orig = item[1].trim();
            const trans = item[0].trim();

            const origParts = orig.split('\n');
            const transParts = trans.split('\n');

            for (let j = 0; j < Math.min(origParts.length, transParts.length); j++) {
              const o = origParts[j].trim().toLowerCase();
              const t = transParts[j].trim();
              if (o) {
                translations[o] = t;
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Translation error for batch:', batch, e);
    }
  }

  if (onProgress) {
    onProgress(phrases.length, phrases.length);
  }

  return translations;
}
