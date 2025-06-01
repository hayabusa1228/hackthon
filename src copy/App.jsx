import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './Header';
import Camera from './Camera';
import AvatarViewer from './AvatarViewer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { textToSpeech } from './utils/voicevox';
function App() {
  const [started, setStarted] = useState(false);
  const [trainer, setTrainer] = useState('A');
  const [menu, setMenu] = useState('menu1');
  const [models, setModels] = useState({ A: null, B: null });
  const [evaluation, setEvaluation] = useState('');

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    const loadModel = (url, key) => {
      loader.load(
        url,
        gltf => setModels(prev => ({ ...prev, [key]: gltf.userData.vrm })),
        undefined,
        err => console.error(`${key} load error:`, err)
      );
    };
    loadModel('/avatars/avatar.vrm', 'A');
    loadModel('/avatars/sport_girl.vrm', 'B');
  }, []);

  useEffect(() => {
    if (evaluation) {
      textToSpeech(evaluation)
    }
  }, [evaluation])

  if (!started) {
    return (
      <div className="titleScreen">
        <h1 className="titleScreen__heading">フィットネストレーナーアプリ</h1><br />
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
            </select>
          </div>
        </div>
        <button
          className="titleScreen__startButton"
          onClick={() => setStarted(true)}
        >
          アプリを起動
        </button>
        <div style={{ display: 'none' }}>
          <Camera />
        </div>
      </div>
    );
  }

  return (
    <div className="AppContainer">
      <Header onReturn={() => setStarted(false)} />

      <div className="App">
        {/* ── 左：ユーザーパネル ── */}
        <div className="panel userPanel">
          <h2 className="panelTitle">User</h2>
          <div className="panelContent">
            <Camera onEvaluation={setEvaluation} />
          </div>
        </div>

        {/* ── 右：トレーナーパネル ── */}
        <div className="panel trainerPanel">
          <h2 className="panelTitle">Trainer</h2>
          <div className="panelContent" style={{ position: 'relative' }}>
            <AvatarViewer
              vrmUrl={trainer === 'A' ? '/avatars/avatar.vrm' : '/avatars/sport_girl.vrm'}
              preloadedVrm={models[trainer]}
            />
            {evaluation && (
              <div
                style={{
                  position: 'absolute',
                  top: '70%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  fontSize: '1.2rem',
                  maxWidth: '80%',
                  textAlign: 'center',
                  zIndex: 10,
                }}
              >
                {evaluation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
