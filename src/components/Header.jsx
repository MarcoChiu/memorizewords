import React from 'react';

export default function Header({
  theme,
  onToggleTheme,
  user,
  onLogin,
  onLogout,
  isFirebaseReady
}) {
  return (
    <header className="app-header">
      <div className="header-logo">
        <img src="./logo.png" alt="Logo" className="logo-icon" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <h1>簡單考 <span className="logo-subtitle">自動翻譯 & 每日抽考</span></h1>
      </div>
      <div className="header-controls">
        <div className="user-profile-section">
          {user ? (
            <div className="user-profile-card">
              <img
                src={user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                alt={user.displayName || '使用者'}
                className="user-avatar"
              />
              <span className="user-name">{user.displayName || '使用者'}</span>
              <button onClick={onLogout} className="btn-logout" title="登出">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button onClick={onLogin} className="btn-login" title="Google 登入">
              <i className="fa-brands fa-google"></i>
              <span className="btn-login-text">Google 登入</span>
              {!isFirebaseReady && <span className="btn-login-text" style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>(未設定)</span>}
            </button>
          )}
        </div>
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
