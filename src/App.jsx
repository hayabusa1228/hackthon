import React from 'react';
import './App.css';
import Camera from './Camera';
import trainerImage from './assets/trainer_image.jpg';

function App() {
  return (
    <div className="App" style={{ display: 'flex', height: '100vh' }}>
      <div
        className="userPanel"
        style={{
          flex: 1,
          borderRight: '1px solid #ccc',
          padding: '10px',
          boxSizing: 'border-box'
        }}
      >
        <h2>User</h2>
        <Camera />
      </div>
      <div
        className="trainerPanel"
        style={{
          flex: 1,
          padding: '10px',
          boxSizing: 'border-box'
        }}
      >
        <h2>Trainer</h2>
        <img
          src={trainerImage}
          alt="Trainer"
          style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
        />
      </div>
    </div>
  );
}

export default App;

