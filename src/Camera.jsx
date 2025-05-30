import React, { useEffect, useRef } from 'react';

const Camera = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
        });
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
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
