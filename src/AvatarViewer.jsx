// src/AvatarViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
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

  // “Relax” or “Cheer” を表すステート
  const [pose, setPose] = useState('Relax');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let initialized = false;

    const tryInitialize = () => {
      if (initialized) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width === 0 || height === 0) return;

      initialized = true;

      // === Three.js のセットアップ ===
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // カメラ設定（少し引き気味）
      const z = 4.0;
      const fovDeg = 45;
      const fovRad = THREE.MathUtils.degToRad(fovDeg);
      const yBottom = -0.0;
      const cameraY = yBottom + Math.tan(fovRad / 2) * z - 0.5;

      const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.1, 1000);
      camera.position.set(0, cameraY, z);
      camera.lookAt(0, yBottom + 0.2, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;
      mount.appendChild(renderer.domElement);

      // ライティング
      const light = new THREE.DirectionalLight(0xffffff, 1.0);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      // === VRM ローダー ===
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const url = vrmUrl.startsWith('/') ? vrmUrl : `/${vrmUrl}`;
      loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          if (!vrm) {
            console.error('gltf.userData.vrm が取得できません。');
            return;
          }

          vrmRef.current = vrm;

          // モデルのスケール・位置・回転を調整
          vrm.scene.scale.set(1.5, 1.5, 1.5);
          vrm.scene.position.set(0, -2.0, 0);
          vrm.scene.rotation.y = Math.PI; // 正面をカメラ側に向ける

          // 初期ポーズ（Relax）を適用
          applyPose('Relax', vrm);

          scene.add(vrm.scene);
        },
        undefined,
        (error) => {
          console.error('VRM 読み込みエラー:', error);
        }
      );

      // レンダーループ
      const animate = () => {
        renderer.render(scene, camera);
        requestIdRef.current = requestAnimationFrame(animate);
      };
      animate();

      // リサイズ対応
      const updateCameraToKeepBottomVisible = () => {
        const newW = mount.clientWidth;
        const newH = mount.clientHeight;
        const cam = cameraRef.current;
        if (!cam) return;
        cam.aspect = newW / newH;
        const newFovRad = Math.atan((cam.position.y - (-0.0)) / cam.position.z) * 2;
        cam.fov = THREE.MathUtils.radToDeg(newFovRad);
        cam.updateProjectionMatrix();
        renderer.setSize(newW, newH);
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

    // サイズが確定するまで待機
    const sizeObserver = new ResizeObserver(() => {
      tryInitialize();
    });
    sizeObserver.observe(mount);
    return () => {
      sizeObserver.disconnect();
    };
  }, [vrmUrl]);

  // “pose” ステートが変わるたびに applyPose を呼び出し
  useEffect(() => {
    if (!vrmRef.current) return;
    applyPose(pose, vrmRef.current);
  }, [pose]);

  // -------------------------------------------------------
  // applyPose 関数：'Relax' / 'Cheer' を VRM に適用する
  // -------------------------------------------------------
  const applyPose = (whichPose, vrm) => {
    if (!vrm.humanoid) return;

    // 左右の上腕・前腕の BoneNode を取得
    const leftUpperArm   = vrm.humanoid.getBoneNode('leftUpperArm');
    const rightUpperArm  = vrm.humanoid.getBoneNode('rightUpperArm');
    const leftLowerArm   = vrm.humanoid.getBoneNode('leftLowerArm');
    const rightLowerArm  = vrm.humanoid.getBoneNode('rightLowerArm');

    // まずはすべての回転をリセット（Tポーズ由来の回転をクリア）
    if (leftUpperArm)   leftUpperArm.rotation.set(0, 0, 0);
    if (rightUpperArm)  rightUpperArm.rotation.set(0, 0, 0);
    if (leftLowerArm)   leftLowerArm.rotation.set(0, 0, 0);
    if (rightLowerArm)  rightLowerArm.rotation.set(0, 0, 0);

    // 指のボーンを取得（右手用）
    const rightThumbProximal     = vrm.humanoid.getBoneNode('rightThumbProximal');
    const rightThumbIntermediate = vrm.humanoid.getBoneNode('rightThumbIntermediate');
    const rightThumbDistal       = vrm.humanoid.getBoneNode('rightThumbDistal');
    const rightIndexProximal     = vrm.humanoid.getBoneNode('rightIndexProximal');
    const rightIndexIntermediate = vrm.humanoid.getBoneNode('rightIndexIntermediate');
    const rightIndexDistal       = vrm.humanoid.getBoneNode('rightIndexDistal');
    const rightMiddleProximal    = vrm.humanoid.getBoneNode('rightMiddleProximal');
    const rightMiddleIntermediate= vrm.humanoid.getBoneNode('rightMiddleIntermediate');
    const rightMiddleDistal      = vrm.humanoid.getBoneNode('rightMiddleDistal');
    const rightRingProximal      = vrm.humanoid.getBoneNode('rightRingProximal');
    const rightRingIntermediate  = vrm.humanoid.getBoneNode('rightRingIntermediate');
    const rightRingDistal        = vrm.humanoid.getBoneNode('rightRingDistal');
    const rightLittleProximal    = vrm.humanoid.getBoneNode('rightLittleProximal');
    const rightLittleIntermediate= vrm.humanoid.getBoneNode('rightLittleIntermediate');
    const rightLittleDistal      = vrm.humanoid.getBoneNode('rightLittleDistal');

    // ------------ Relax ポーズ ------------
    if (whichPose === 'Relax') {
      // 左右両腕を体の横に自然に垂らす
      if (leftUpperArm)   leftUpperArm.rotation.set(0, 0,  Math.PI / 2);
      if (rightUpperArm)  rightUpperArm.rotation.set(0, 0, -Math.PI / 2);

      // 前腕を軽く曲げる
      if (leftLowerArm)   leftLowerArm.rotation.set(-Math.PI / 8, 0, 0);
      if (rightLowerArm)  rightLowerArm.rotation.set(-Math.PI / 8, 0, 0);

      // 指の回転リセット（握っていない状態）
      if (rightThumbProximal)      rightThumbProximal.rotation.set(0, 0, 0);
      if (rightThumbIntermediate)  rightThumbIntermediate.rotation.set(0, 0, 0);
      if (rightThumbDistal)        rightThumbDistal.rotation.set(0, 0, 0);
      if (rightIndexProximal)      rightIndexProximal.rotation.set(0, 0, 0);
      if (rightIndexIntermediate)  rightIndexIntermediate.rotation.set(0, 0, 0);
      if (rightIndexDistal)        rightIndexDistal.rotation.set(0, 0, 0);
      if (rightMiddleProximal)     rightMiddleProximal.rotation.set(0, 0, 0);
      if (rightMiddleIntermediate) rightMiddleIntermediate.rotation.set(0, 0, 0);
      if (rightMiddleDistal)       rightMiddleDistal.rotation.set(0, 0, 0);
      if (rightRingProximal)       rightRingProximal.rotation.set(0, 0, 0);
      if (rightRingIntermediate)   rightRingIntermediate.rotation.set(0, 0, 0);
      if (rightRingDistal)         rightRingDistal.rotation.set(0, 0, 0);
      if (rightLittleProximal)     rightLittleProximal.rotation.set(0, 0, 0);
      if (rightLittleIntermediate) rightLittleIntermediate.rotation.set(0, 0, 0);
      if (rightLittleDistal)       rightLittleDistal.rotation.set(0, 0, 0);

      return;
    }

    // ------------ Cheer（頑張れ）ポーズ ------------
    if (whichPose === 'Cheer') {
      // 右腕を上げる
      if (rightUpperArm)  rightUpperArm.rotation.set(-1, 2.2, 1.8);
      if (rightLowerArm)  rightLowerArm.rotation.set(1, 0, 0);

      // 左腕はRelaxと同じ：体の横に自然に垂らす
      if (leftUpperArm)   leftUpperArm.rotation.set(0, 0,  Math.PI / 2);
      if (leftLowerArm)   leftLowerArm.rotation.set(-Math.PI / 8, 0, 0);

      // 右手をグー（拳）にするため、指を内側に曲げる
      // 親指
      if (rightThumbProximal)      rightThumbProximal.rotation.set(0,  1.5,   0);
      if (rightThumbIntermediate)  rightThumbIntermediate.rotation.set(1,  1.0,   1);
      if (rightThumbDistal)        rightThumbDistal.rotation.set(0,  1.0,   0);
      // 人差し指
      if (rightIndexProximal)      rightIndexProximal.rotation.set(-1.5, 1.5, 0);
      if (rightIndexIntermediate)  rightIndexIntermediate.rotation.set(-.5, 1.5, 0);
      if (rightIndexDistal)        rightIndexDistal.rotation.set(-1.5, 0, 0);
      // 中指
      if (rightMiddleProximal)     rightMiddleProximal.rotation.set(-1.5, 1.5, 0);
      if (rightMiddleIntermediate) rightMiddleIntermediate.rotation.set(-1.5, 1.5, 0);
      if (rightMiddleDistal)       rightMiddleDistal.rotation.set(-1.5, 0, 0);
      // 薬指
      if (rightRingProximal)       rightRingProximal.rotation.set(-1.5, 1.5, 0);
      if (rightRingIntermediate)   rightRingIntermediate.rotation.set(-1.5, 1.5, 0);
      if (rightRingDistal)         rightRingDistal.rotation.set(-1.5, 0, 0);
      // 小指
      if (rightLittleProximal)     rightLittleProximal.rotation.set(-1.5, 1.5, 0);
      if (rightLittleIntermediate) rightLittleIntermediate.rotation.set(-1.5, 1.5, 0);
      if (rightLittleDistal)       rightLittleDistal.rotation.set(-1.5, 0, 0);

      return;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      {/* ポーズ切替ボタン */}
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)' }}>
        {['Relax', 'Cheer'].map((key) => (
          <button
            key={key}
            onClick={() => setPose(key)}
            style={{
              margin: '0 6px',
              padding: '6px 12px',
              backgroundColor: pose === key ? '#4CAF50' : '#eee',
              color: pose === key ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarViewer;
