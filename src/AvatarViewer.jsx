// src/AvatarViewer.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

const AvatarViewer = ({ vrmUrl }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const requestIdRef = useRef(null);
  const vrmRef = useRef(null);

  useEffect(() => {
    // 1) シーン・カメラ・レンダラーをセットアップ
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // シーンを作成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // カメラを作成（視野角 45°, アスペクト比, near, far）
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0.0, 1.0, 3.0); // 少し後ろから見下ろすようにする
    camera.lookAt(new THREE.Vector3(0, 1, 0));
    cameraRef.current = camera;

    // レンダラーを作成
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // mount 先の div にレンダラーの DOM を追加
    mountRef.current.appendChild(renderer.domElement);

    // 2) ライトを追加
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 3) GLTFLoader + VRMLoaderPlugin を使って VRM をロード
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    loader.load(
      vrmUrl,
      (gltf) => {
        // gltf.userData.vrm に VRM オブジェクトが入っている
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;

        // VRM の初期スケールを調整（必要に応じて変更してください）
        vrm.scene.scale.set(1.0, 1.0, 1.0);

        // VRM をシーンに追加
        scene.add(vrm.scene);

        console.log('✔ VRM model loaded:', vrm);
      },
      (progress) => {
        // ロード進行表示（必要に応じて）
        console.log(`Loading VRM: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
      },
      (error) => {
        console.error('✖ Error loading VRM:', error);
      }
    );

    // 4) アニメーションループを開始
    const animate = () => {
      // VRM がロードされていれば、頭（Head）の方向を少し揺らすなども可能
      if (vrmRef.current) {
        // VRM の root がシーンに含まれているかチェック
        // ここでは単純にゆらゆらと少しだけ腕を動かしてみる例：
        const now = Date.now() / 1000;
        vrmRef.current.humanoid.getNormalizedBoneNode(
          VRM.HumanoidBoneName.RightUpperArm
        ).rotation.z = Math.sin(now) * 0.2;
      }

      renderer.render(scene, camera);
      requestIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 5) リサイズイベントに対応
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      cancelAnimationFrame(requestIdRef.current);
      window.removeEventListener('resize', handleResize);

      // シーンから VRM を削除（メモリリーク防止）
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current.dispose();
      }

      // レンダラーの DOM 要素を外す
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
