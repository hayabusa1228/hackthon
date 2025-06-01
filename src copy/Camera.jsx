import React, { useEffect, useRef } from 'react';

const Camera = ({ onEvaluation }) => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => { });
          }
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
        });
    }

    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      (async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (!blob) return;

        const form = new FormData();
        form.append('image', blob, 'frame.png');

        try {
          const res = await fetch('http://127.0.0.1:8000/api/post_image', {
            method: 'POST',
            body: form,
          });
          const json = await res.json();
          console.log('LLM評価結果:', json.evaluation);
          onEvaluation?.(json.evaluation); // ← 親へ通知
        } catch (e) {
          console.error('Upload failed:', e);
        }
      })();
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '12px',
        }}
      />
    </div>
  );
};

export default Camera;
