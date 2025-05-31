// src/utils/voicevox.js
// 改善版: su-shiki のホスト型 VoiceVox API を使って、一度のリクエストで音声を取得・再生する例

// 声の候補
// 8
// 9
// 10: 
// 14:
// 20
// 43

export async function textToSpeech(text, speaker = 13) {
  if (!text) return;
  // 取得した API キーをここに貼り付けてください
  const apiKey = "m_5674K00704964";

  // 1. テキストをエンコードし、GET パラメータ付きの URL を作成
  const query = encodeURIComponent(text);
  const url = `https://api.su-shiki.com/v2/voicevox/audio/?text=${query}&speaker=${speaker}&key=${apiKey}`;

  // 2. fetch で一度のリクエストで音声データを取得
  const res = await fetch(url, {
    method: "GET",
    mode: "cors" // CORS はすでに許可済みなのでそのまま呼べます
  });
  if (!res.ok) {
    throw new Error(`VoiceVox API failed: ${res.status} ${res.statusText}`);
  }

  // 3. Blob を生成して再生
  const audioBlob = await res.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  await audio.play();
  return audio;
}
