// App.jsx
import React from 'react';
import './App.css';
import Header from './Header';    // 追加
import Camera from './Camera';
import trainerImage from './assets/trainer_image.jpg';

function App() {
  return (
    <div className="AppContainer">
      {/* 画面上部のヘッダー */}
      <Header />

      {/* ヘッダー下の左右パネル */}
      <div className="App">
        <div className="panel userPanel">
          <h2 className="panelTitle">User</h2>
          <div className="panelContent">
            <Camera />
          </div>
        </div>
        <div className="panel trainerPanel">
          <h2 className="panelTitle">Trainer</h2>
          <div className="panelContent">
            <img
              src={trainerImage}
              alt="Trainer"
              className="trainerImage"
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
