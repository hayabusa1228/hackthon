// src/utils/voicevox.js
// VOICEVOX の REST API を利用してテキストを音声合成し再生する関数

export async function textToSpeech(text, speaker = 2) {
  if (!text) return;
  // 1. クエリを作成
  const queryRes = await fetch(
    `http://localhost:50021/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`,
    { method: 'POST' }
  );
  if (!queryRes.ok) {
    throw new Error(`audio_query failed: ${queryRes.statusText}`);
  }
  const queryJson = await queryRes.json();

  // 2. 音声を合成
  const synthesisRes = await fetch(
    `http://localhost:50021/synthesis?speaker=${speaker}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryJson),
    }
  );
  if (!synthesisRes.ok) {
    throw new Error(`synthesis failed: ${synthesisRes.statusText}`);
  }
  const audioBlob = await synthesisRes.blob();

  // 3. 再生
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  await audio.play();
  return audio;
}
