import React from 'react';

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <div className="header-logo">
        <i className="fa-solid fa-graduation-cap logo-icon"></i>
        <h1>EngFlow <span className="logo-subtitle">自動翻譯 & 每日抽考</span></h1>
      </div>
      <div className="header-controls">
        <button 
          id="theme-toggle" 
          className="btn-icon" 
          onClick={onToggleTheme} 
          aria-label="切換主題"
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </div>
    </header>
  );
}
