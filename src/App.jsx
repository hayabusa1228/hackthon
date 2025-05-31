// src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './Header';
import Camera from './Camera';
import AvatarViewer from './AvatarViewer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

function App() {
  const [started, setStarted] = useState(false);
  const [trainer, setTrainer] = useState('A'); // トレーナー選択状態
  const [menu, setMenu] = useState('menu1'); // トレーニングメニュー選択状態
  const [models, setModels] = useState({ A: null, B: null });

  // タイトル画面表示時にVRMを事前読み込み
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    const loadModel = (url, key) => {
      loader.load(url,
        gltf => setModels(prev => ({ ...prev, [key]: gltf.userData.vrm })),
        undefined,
        err => console.error(`${key} load error:`, err)
      );
    };
    loadModel('/avatars/avatar.vrm', 'A');
    loadModel('/avatars/sport_girl.vrm', 'B');
  }, []);

  // タイトル画面
  if (!started) {
    return (
      <div className="titleScreen">
        <h1 className="titleScreen__heading">フィットネストレーナーアプリ</h1><br></br>
        <div className="titleScreen__controls">
          <div className="titleScreen__selectBox">
            <label htmlFor="trainer-select" className="titleScreen__label">トレーナーを選択:</label>
            <select
              id="trainer-select"
              value={trainer}
              onChange={e => setTrainer(e.target.value)}
              className="titleScreen__select"
            >
              <option value="A">トレーナー A</option>
              <option value="B">トレーナー B</option>
              {/* 必要なら他のオプションを追加 */}
            </select>
          </div>
          <div className="titleScreen__selectBox">
            <label htmlFor="menu-select" className="titleScreen__label">トレーニングメニュー:</label>
            <select
              id="menu-select"
              value={menu}
              onChange={e => setMenu(e.target.value)}
              className="titleScreen__select"
            >
              <option value="menu1">プランク</option>
              {/* 他のメニューがあれば追加 */}
            </select>
          </div>
        </div>
        <button
          className="titleScreen__startButton"
          onClick={() => setStarted(true)}
        >
          アプリを起動
        </button>
        {/* タイトル画面でもカメラ起動 (非表示) */}
        <div style={{ display: 'none' }}>
          <Camera />
        </div>
      </div>
    );
  }

  // （省略：アプリ本体部分）
  return (
    <div className="AppContainer">
      {/* ヘッダー：タイトルへ戻るボタンを渡す */}
      <Header onReturn={() => setStarted(false)} />

      <div className="App">
        {/* ── 左：ユーザーパネル ── */}
        <div className="panel userPanel">
          <h2 className="panelTitle">User</h2>
          {/* <div style={{ padding: '0 12px', fontStyle: 'italic' }}>
            選択メニュー: {menu === 'menu1' ? 'メニュー 1' : 'メニュー 2'}
          </div> */}
          <div className="panelContent">
            <Camera />
          </div>
        </div>

        {/* ── 右：トレーナーパネル ── */}
        <div className="panel trainerPanel">
          <h2 className="panelTitle">Trainer</h2>
          <div className="panelContent">
            <AvatarViewer
              vrmUrl={trainer === 'A' ? '/avatars/avatar.vrm' : '/avatars/sport_girl.vrm'}
              preloadedVrm={models[trainer]}
            />
          </div>
          <div className="subtitle">
            トレーナーのセリフがここに表示されます
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
