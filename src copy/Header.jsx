// Header.jsx
import React from 'react';

const Header = ({ onReturn }) => {
  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* 左端：アプリ名 */}
      <h1 className="headerTitle">My Zoom App</h1>
      {/* 右端：タイトルへ戻るボタン */}
      {onReturn && (
        <button onClick={onReturn} style={{ padding: '6px 12px', fontSize: '14px', cursor: 'pointer' }}>
          タイトルへ戻る
        </button>
      )}
    </header>
  );
};

export default Header;
