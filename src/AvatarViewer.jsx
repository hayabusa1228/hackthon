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

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // カメラ作成（仮の位置で初期化）
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const url = vrmUrl.startsWith('/') ? vrmUrl : `/${vrmUrl}`;
    loader.load(
      url,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;

        vrm.scene.scale.set(1.5, 1.5, 1.5);
        vrm.scene.position.set(0, -0.8, 0);

        scene.add(vrm.scene);

        console.log('✔ VRM model loaded:', vrm);
      },
      (progress) => {
        console.log(`Loading VRM: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
      },
      (error) => {
        console.error('✖ Error loading VRM:', error);
      }
    );

    const animate = () => {
      renderer.render(scene, camera);
      requestIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // y=0 を常に画面の下端に映すようにカメラ位置を調整
    const updateCameraToKeepBottomVisible = () => {
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;

      const cam = cameraRef.current;
      if (!cam) return;

      cam.aspect = newWidth / newHeight;

      const z = cam.position.z; // 固定で使う
      const cameraY = cam.position.y; // たとえば 1.5 など
      const yBottom = 0.0;

      // 「視野の半分 = Yから下端までの距離 / Z」
      const fovRad = Math.atan((cameraY - yBottom) / z) * 2;
      cam.fov = THREE.MathUtils.radToDeg(fovRad);

      cam.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const observer = new ResizeObserver(updateCameraToKeepBottomVisible);
    observer.observe(mount);
    updateCameraToKeepBottomVisible(); // 初期表示時にも呼ぶ

    return () => {
      cancelAnimationFrame(requestIdRef.current);
      observer.disconnect();

      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        if (typeof vrmRef.current.dispose === 'function') {
          vrmRef.current.dispose();
        }
        vrmRef.current = null;
      }

      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
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
