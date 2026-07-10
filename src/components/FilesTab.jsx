import React, { useState, useEffect, useRef } from 'react';

export default function FilesTab({
  files,
  activeFileName,
  localFiles,
  loadedVocabs,
  isLoading,
  translationProgress,
  isTranslating,
  onRefreshFiles,
  onLoadFile,
  onUploadLocalFiles,
  speak,
  showToast
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [hideChinese, setHideChinese] = useState(false);
  const [blurredCards, setBlurredCards] = useState({});
  const fileInputRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Sync ref with state to prevent closure issues in speech callbacks
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Handle auto-playing list
  useEffect(() => {
    if (!isPlaying) {
      setPlayingIndex(-1);
      return;
    }

    if (playingIndex < 0 || playingIndex >= loadedVocabs.length) {
      if (playingIndex >= loadedVocabs.length && loadedVocabs.length > 0) {
        showToast("單字朗讀完畢！");
      }
      setIsPlaying(false);
      setPlayingIndex(-1);
      return;
    }

    const currentVocab = loadedVocabs[playingIndex];
    
    // Find the element and scroll to it
    const element = document.getElementById(`card-${currentVocab.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Trigger TTS
    speak(currentVocab.english, () => {
      if (!isPlayingRef.current) return;
      
      const timer = setTimeout(() => {
        if (!isPlayingRef.current) return;
        setPlayingIndex(prev => prev + 1);
      }, 1500);

      return () => clearTimeout(timer);
    }, true);

  }, [isPlaying, playingIndex, loadedVocabs]);

  // Sync blur states when hideChinese is toggled
  useEffect(() => {
    const newBlurred = {};
    loadedVocabs.forEach(item => {
      newBlurred[item.id] = hideChinese;
    });
    setBlurredCards(newBlurred);
  }, [hideChinese, loadedVocabs]);

  const handleStartPlayer = () => {
    if (loadedVocabs.length === 0) {
      showToast("目前沒有單字可以朗讀！");
      return;
    }
    setIsPlaying(true);
    setPlayingIndex(0);
  };

  const handleStopPlayer = () => {
    setIsPlaying(false);
    setPlayingIndex(-1);
    window.speechSynthesis.cancel();
  };

  const handleToggleCardBlur = (id) => {
    setBlurredCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFileChange = (e) => {
    const uploaded = e.target.files;
    if (uploaded && uploaded.length > 0) {
      onUploadLocalFiles(uploaded);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <section id="files-tab" className="tab-panel active">
      <div className="dashboard-grid">
        {/* Files Selection List */}
        <div className="card glass select-file-panel">
          <div className="card-header">
            <h2><i className="fa-solid fa-file-invoice"></i> 每日學習檔案</h2>
            <p>點擊載入專案資料夾下的 txt 檔案或本機單字檔</p>
          </div>

          <div className="file-list-container">
            <div id="file-list" className="file-buttons-list">
              {isLoading ? (
                <div className="file-list-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i> 正在讀取檔案...
                </div>
              ) : files.length === 0 ? (
                <div className="file-list-loading error-text">
                  <i className="fa-solid fa-triangle-exclamation"></i> 無可用單字檔<br />
                  <span style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '5px', display: 'block' }}>
                    請載入本機單字檔 (.txt)
                  </span>
                </div>
              ) : (
                files.map((file) => {
                  const isLocal = localFiles[file] !== undefined;
                  const isActive = file === activeFileName;
                  return (
                    <button
                      key={file}
                      className={`file-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (isPlaying) handleStopPlayer();
                        onLoadFile(file);
                      }}
                    >
                      {isLocal ? (
                        <>
                          <i className="fa-regular fa-file-code" style={{ color: 'var(--accent-light, #818cf8)' }}></i>
                          {file}
                          <span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 'auto', paddingLeft: '5px' }}>
                            (本機)
                          </span>
                        </>
                      ) : (
                        <>
                          <i className="fa-regular fa-file-lines"></i>
                          {file}
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="file-list-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              id="btn-refresh-files" 
              onClick={onRefreshFiles} 
              className="btn btn-secondary btn-block btn-sm"
            >
              <i className="fa-solid fa-arrows-rotate"></i> 重新整理伺服器檔案
            </button>
            <input
              type="file"
              id="local-file-input"
              accept=".txt"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              id="btn-select-local-file"
              onClick={() => fileInputRef.current.click()}
              className="btn btn-primary btn-block btn-sm"
            >
              <i className="fa-solid fa-file-import"></i> 載入本機 .txt 單字檔
            </button>
          </div>
        </div>

        {/* Active File Words Display */}
        <div className="card glass words-display-panel">
          <div className="card-header flex-header">
            <div className="words-header-info">
              <h2 id="active-file-title">{activeFileName || '未選擇檔案'}</h2>
              <p id="active-file-desc">
                {activeFileName 
                  ? isTranslating ? '正在讀取檔案內容並翻譯...' : `成功載入 ${loadedVocabs.length} 個單字。`
                  : '請從左側點選以載入單字。系統將透過 Google 翻譯自動翻譯。'
                }
              </p>
            </div>

            {/* Playlist Player Controls */}
            {loadedVocabs.length > 0 && !isTranslating && (
              <div id="list-player-controls" className="list-player-controls">
                {!isPlaying ? (
                  <button 
                    id="btn-player-play" 
                    onClick={handleStartPlayer} 
                    className="btn btn-primary btn-sm"
                  >
                    <i className="fa-solid fa-circle-play"></i> 自動朗讀全部 (跟讀)
                  </button>
                ) : (
                  <button 
                    id="btn-player-stop" 
                    onClick={handleStopPlayer} 
                    className="btn btn-danger-outline btn-sm"
                  >
                    <i className="fa-solid fa-circle-stop"></i> 停止朗讀
                  </button>
                )}
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    id="player-hide-chinese"
                    checked={hideChinese}
                    onChange={(e) => setHideChinese(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">遮蔽中文 (點選顯現)</span>
                </label>
              </div>
            )}
          </div>

          {/* Translate Loading Progress */}
          {isTranslating && (
            <div id="translation-loader" className="translation-loader">
              <div className="loader-spinner"><i className="fa-solid fa-spinner fa-spin"></i></div>
              <div className="loader-text">
                正在透過 Google 翻譯抓取譯文: <span id="translation-progress">{translationProgress}</span>...
              </div>
            </div>
          )}

          {/* Word List Grid */}
          <div className="vocab-container">
            {loadedVocabs.length > 0 ? (
              <div id="loaded-words-list" className="vocab-grid">
                {loadedVocabs.map((item, index) => {
                  const isWordPlaying = playingIndex === index;
                  const isBlurred = blurredCards[item.id];
                  return (
                    <div
                      key={item.id}
                      id={`card-${item.id}`}
                      className={`vocab-card glass ${isWordPlaying ? 'active-playing' : ''}`}
                    >
                      <div className="vocab-card-header">
                        <span className="tag-badge">每日英文</span>
                      </div>
                      <div className="vocab-english-area">
                        <h3 className="vocab-card-english">{item.english}</h3>
                        <button
                          className="btn-speak-vocab"
                          onClick={() => speak(item.english)}
                        >
                          <i className="fa-solid fa-volume-high"></i>
                        </button>
                      </div>
                      <p
                        className={`vocab-card-chinese ${isBlurred ? 'blurred' : ''}`}
                        onClick={() => handleToggleCardBlur(item.id)}
                      >
                        {item.chinese}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              !isTranslating && (
                <div id="words-empty" className="empty-state glass">
                  <i className="fa-solid fa-file-circle-plus empty-icon"></i>
                  <h3>尚未載入每日單字</h3>
                  <p>
                    請於左側選擇檔案。您也可以在專案的 `public/data/` 資料夾中新增如 `20260609.txt` 檔案，
                    每行輸入一個英文單字或句子，並執行 `npm run build` 更新清單。
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
