// src/AvatarViewer.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const AvatarViewer = ({ vrmUrl }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const requestIdRef = useRef(null);
  const vrmRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let initialized = false;

    const tryInitialize = () => {
      if (initialized) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      if (width === 0 || height === 0) return; // ← サイズが0なら何もしない

      initialized = true;

      // === Three.js 初期化ここから ===
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      sceneRef.current = scene;

      const z = 3.0;
      const fovDeg = 45;
      const fovRad = THREE.MathUtils.degToRad(fovDeg);
      const yBottom = -0.0;
      const cameraY = yBottom + Math.tan(fovRad / 2) * z - 0.5;

      const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.1, 1000);
      camera.position.set(0, cameraY, z);
      camera.lookAt(0, yBottom + 0.2, 0)
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;

      mount.appendChild(renderer.domElement);

      const light = new THREE.DirectionalLight(0xffffff, 1.0);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const url = vrmUrl.startsWith('/') ? vrmUrl : `/${vrmUrl}`;
      loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          vrmRef.current = vrm;
          vrm.scene.scale.set(1.5, 1.5, 1.5);
          vrm.scene.position.set(0, -2.0, 0);
          scene.add(vrm.scene);
        }
      );

      const animate = () => {
        renderer.render(scene, camera);
        requestIdRef.current = requestAnimationFrame(animate);
      };
      animate();

      const updateCameraToKeepBottomVisible = () => {
        const newWidth = mount.clientWidth;
        const newHeight = mount.clientHeight;
        const cam = cameraRef.current;
        if (!cam) return;

        cam.aspect = newWidth / newHeight;

        const newFovRad = Math.atan((cam.position.y - yBottom) / cam.position.z) * 2;
        cam.fov = THREE.MathUtils.radToDeg(newFovRad);
        cam.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
      };

      const observer = new ResizeObserver(updateCameraToKeepBottomVisible);
      observer.observe(mount);
      updateCameraToKeepBottomVisible();

      // クリーンアップ
      const cleanup = () => {
        cancelAnimationFrame(requestIdRef.current);
        observer.disconnect();
        if (vrmRef.current) {
          scene.remove(vrmRef.current.scene);
          if (typeof vrmRef.current.dispose === 'function') {
            vrmRef.current.dispose();
          }
          vrmRef.current = null;
        }
        if (renderer.domElement && mount) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };

      window.addEventListener('beforeunload', cleanup);
    };

    const sizeObserver = new ResizeObserver(() => {
      tryInitialize();
    });
    sizeObserver.observe(mount);

    return () => {
      sizeObserver.disconnect();
    };
  }, [vrmUrl]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
};

export default AvatarViewer;
