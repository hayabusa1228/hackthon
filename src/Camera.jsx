import React, { useEffect, useRef } from 'react';

const Camera = () => {
  const videoRef = useRef(null);
  // const intervalRef = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {
              // play interrupted by new load request, ignore
            });
          }
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
        });
    }

    // // 5秒ごとにカメラ画像をサーバーへPOST
    // intervalRef.current = setInterval(() => {
    //   const video = videoRef.current;
    //   if (!video || video.readyState < 2) return;
    //   (async () => {
    //     const canvas = document.createElement('canvas');
    //     canvas.width = video.videoWidth;
    //     canvas.height = video.videoHeight;
    //     const ctx = canvas.getContext('2d');
    //     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //     const blob = await new Promise((resolve) =>
    //       canvas.toBlob(resolve, 'image/png')
    //     );
    //     if (!blob) return;
    //     const form = new FormData();
    //     form.append('image', blob, 'frame.png');
    //     try {
    //       await fetch('http://localhost:8000/upload', {
    //         method: 'POST',
    //         body: form,
    //       });
    //     } catch (e) {
    //       console.error('Upload failed:', e);
    //     }
    //   })();
    // }, 5000);

    // // クリーンアップ
    // return () => {
    //   if (intervalRef.current) clearInterval(intervalRef.current);
    // };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        autoPlay
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        muted
        playsInline
      />
    </div>
  );
};

export default Camera;
