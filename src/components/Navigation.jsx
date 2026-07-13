import React from 'react';

export default function Navigation({ activeTab, onSwitchTab }) {
  return (
    <nav className="app-nav">
      <button
        className={`nav-tab ${activeTab === 'files-tab' ? 'active' : ''}`}
        onClick={() => onSwitchTab('files-tab')}
      >
        <i className="fa-solid fa-folder-open"></i> 選擇每日檔案
      </button>
      <button
        className={`nav-tab ${activeTab === 'quiz-tab' ? 'active' : ''}`}
        onClick={() => onSwitchTab('quiz-tab')}
        id="nav-quiz-tab"
      >
        <i className="fa-solid fa-laptop-code"></i> 英文抽考
      </button>
      <button
        className={`nav-tab ${activeTab === 'settings-tab' ? 'active' : ''}`}
        onClick={() => onSwitchTab('settings-tab')}
      >
        <i className="fa-solid fa-sliders"></i> 語音設定
      </button>
    </nav>
  );
}
