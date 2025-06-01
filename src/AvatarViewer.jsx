// src/AvatarViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import trainersJson from './trainers.json';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { textToSpeech } from './utils/voicevox';

// trainerId を受け取る形に拡張
const AvatarViewer = ({ vrmUrl, preloadedVrm, trainerId, pose: externalPose }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const requestIdRef = useRef(null);
  const vrmRef = useRef(null);

  // 選択中ポーズ名
  const [pose, setPose] = useState(externalPose || 'Pose1');
  // 外部からposeが変わったら反映
  useEffect(() => {
    if (externalPose && externalPose !== pose) {
      setPose(externalPose);
    }
  }, [externalPose]);

  // トレーナー情報取得
  const trainerInfo = trainersJson.find(t => t.vrmUrl === vrmUrl || t.id === trainerId) || {};
  // 新しいcamera, poses形式に対応
  const cameraConfig = trainerInfo.camera || { z: 4.0, fovDeg: 45, yBottom: 0.0, cameraYOffset: -0.5, lookAtYOffset: 0.2 };
  const poseConfig = trainerInfo.poses || {};
  // ポーズ名リスト
  const poseNames = Object.keys(poseConfig);
  // 発言内容（poseごとにjsonで指定）
  const poseSpeech = trainerInfo.poseSpeech || {};

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

      // カメラ設定（新形式対応）
      const z = cameraConfig.z;
      const fovDeg = cameraConfig.fovDeg;
      const yBottom = cameraConfig.yBottom;
      const cameraYOffset = cameraConfig.cameraYOffset;
      const lookAtYOffset = cameraConfig.lookAtYOffset;

      // カメラのzは「奥行き」方向。yBottom/cameraYOffsetは「上下」位置。
      // カメラのzを直接反映し、yはyBottom+cameraYOffset（符号反転なし）
      // yBottom - cameraYOffset で上下反転を防ぐ
      const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.1, 5000);
      camera.position.set(0, yBottom - cameraYOffset, z);
      camera.lookAt(0, yBottom + lookAtYOffset, 0);
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

      // VRM読み込み or プリロード済み利用
      const modelYOffset = trainerInfo.modelYOffset ?? -2.0;
      const modelScale = trainerInfo.modelScale ?? 1.5;
      if (preloadedVrm) {
        vrmRef.current = preloadedVrm;
        // モデルのスケール・位置・回転を調整
        preloadedVrm.scene.scale.set(modelScale, modelScale, modelScale);
        preloadedVrm.scene.position.set(0, modelYOffset, 0);
        preloadedVrm.scene.rotation.y = Math.PI;
        // 初期ポーズ（Relax）を適用
        applyPose('Pose1', preloadedVrm);
        scene.add(preloadedVrm.scene);
      } else {
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
            vrm.scene.scale.set(modelScale, modelScale, modelScale);
            vrm.scene.position.set(0, modelYOffset, 0);
            vrm.scene.rotation.y = Math.PI;
            applyPose('Pose1', vrm);
            scene.add(vrm.scene);
          },
          undefined,
          (error) => {
            console.error('VRM 読み込みエラー:', error);
          }
        );
      }

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
  }, [vrmUrl, preloadedVrm]);

  // “pose” ステートが変わるたびに applyPose を呼び出し
  useEffect(() => {
    if (!vrmRef.current) return;
    applyPose(pose, vrmRef.current);
  }, [pose]);

  // -------------------------------------------------------
  // applyPose 関数：'Relax' / 'Cheer' を VRM に適用する（trainerごとに）
  // -------------------------------------------------------
  const applyPose = (whichPose, vrm) => {
    if (!vrm.humanoid) return;

    // --- 表情リセット＆切り替え ---
    if (vrm.expressionManager && vrm.expressionManager.setValue) {
      // VRM 0.x/1.x両対応: プリセット表情名リスト
      const expressions = ['neutral', 'smile', 'fun', 'angry', 'sorrow'];
      expressions.forEach(name => vrm.expressionManager.setValue(name, 0));
      const poseData = poseConfig[whichPose] || {};
      if (poseData.expression && expressions.includes(poseData.expression)) {
        vrm.expressionManager.setValue(poseData.expression, 1.0);
      }
    }

    // ボーン名リスト
    const boneNames = [
      // 体幹・首・頭
      'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
      // 腕・手首・指
      'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
      'leftHand', 'rightHand',
      // 脚
      'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg',
      // 指
      'rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
      'leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal'
    ];

    // まずはすべての回転をリセット
    boneNames.forEach(boneName => {
      const bone = vrm.humanoid.getBoneNode(boneName);
      if (bone) bone.rotation.set(0, 0, 0);
    });

    // trainer.json の pose 設定
    const poseData = poseConfig[whichPose] || {};
    boneNames.forEach(boneName => {
      if (poseData[boneName]) {
        const bone = vrm.humanoid.getBoneNode(boneName);
        if (bone) bone.rotation.set(...poseData[boneName]);
      }
    });

    // デフォルトの追加動作（Relax時の前腕・指リセットなど）
    if (whichPose === 'Pose1') {
      const leftLowerArm = vrm.humanoid.getBoneNode('leftLowerArm');
      const rightLowerArm = vrm.humanoid.getBoneNode('rightLowerArm');
      if (leftLowerArm && !poseData.leftLowerArm) leftLowerArm.rotation.set(-Math.PI / 8, 0, 0);
      if (rightLowerArm && !poseData.rightLowerArm) rightLowerArm.rotation.set(-Math.PI / 8, 0, 0);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      {/* ポーズ切替ボタン削除済み */}
    </div>
  );
};

export default AvatarViewer;
