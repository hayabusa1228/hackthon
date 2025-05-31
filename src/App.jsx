// src/App.jsx
import React from 'react';
import './App.css';
import Header from './Header';
import Camera from './Camera';
import AvatarViewer from './AvatarViewer';

function App() {
  return (
    <div className="AppContainer">
      {/* ① ヘッダー */}
      <Header />

      {/* ② ヘッダー下：左右パネル */}
      <div className="App">
        {/* ── 左：ユーザーパネル ── */}
        <div className="panel userPanel">
          <h2 className="panelTitle">User</h2>
          <div className="panelContent">
            <Camera />
          </div>
        </div>

        {/* ── 右：トレーナーパネル ── */}
        <div className="panel trainerPanel">
          <h2 className="panelTitle">Trainer</h2>
          <div className="panelContent">
            {/* ここで <img> ではなく <AvatarViewer> を使う */}
            {/* <AvatarViewer vrmUrl="/avatars/avatar.vrm" /> */}
            <AvatarViewer vrmUrl="/avatars/sport_girl.vrm" />
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
