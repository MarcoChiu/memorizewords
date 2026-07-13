import React, { useState, useEffect, useRef } from 'react';

export default function FilesTab({
  categories,
  activeCategoryId,
  loadedVocabs,
  isLoading,
  translationProgress,
  isTranslating,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onSelectCategory,
  onAddWord,
  onEditWord,
  onDeleteWord,
  speak,
  showToast,
  user,
  onLogin
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [hideChinese, setHideChinese] = useState(false);
  const [blurredCards, setBlurredCards] = useState({});
  const isPlayingRef = useRef(false);

  // States for Category Management
  const [newCatName, setNewCatName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // States for Word Management
  const [newWordEng, setNewWordEng] = useState('');
  const [newWordChi, setNewWordChi] = useState('');
  const [editingVocabId, setEditingVocabId] = useState('');
  const [editingWordEng, setEditingWordEng] = useState('');
  const [editingWordChi, setEditingWordChi] = useState('');

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

  // Category Actions
  const handleAddCategorySubmit = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleStartCategoryEdit = (cat) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleSaveCategoryEdit = (id) => {
    if (!editingCategoryName.trim()) return;
    onEditCategory(id, editingCategoryName.trim());
    setEditingCategoryId('');
  };

  // Word Actions
  const handleAddWordSubmit = () => {
    if (!newWordEng.trim()) return;
    onAddWord(newWordEng.trim(), newWordChi.trim());
    setNewWordEng('');
    setNewWordChi('');
  };

  const handleStartWordEdit = (vocab) => {
    setEditingVocabId(vocab.id);
    setEditingWordEng(vocab.english);
    setEditingWordChi(vocab.chinese);
  };

  const handleSaveWordEdit = (id) => {
    if (!editingWordEng.trim()) return;
    onEditWord(id, editingWordEng.trim(), editingWordChi.trim());
    setEditingVocabId('');
  };

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

  // If user is not logged in, prompt to log in
  if (!user) {
    return (
      <section id="files-tab" className="tab-panel active">
        <div className="empty-state glass text-center" style={{ maxWidth: '500px', margin: '60px auto', padding: '40px 24px', borderRadius: 'var(--radius-lg)' }}>
          <i className="fa-solid fa-user-lock empty-icon" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '20px' }}></i>
          <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 600 }}>請先登入帳號</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6, fontSize: '15px' }}>
            EngFlow 智慧單字庫已升級為雲端資料庫儲存。請登入您的 Google 帳號，即可開始建立專屬分類、增刪單字卡，並自動進行雲端同步！
          </p>
          <button onClick={onLogin} className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '30px' }}>
            <i className="fa-brands fa-google"></i>
            <span>使用 Google 登入</span>
          </button>
        </div>
      </section>
    );
  }

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <section id="files-tab" className="tab-panel active">
      <div className="dashboard-grid">
        {/* Left Side: Categories List */}
        <div className="card glass select-file-panel">
          <div className="card-header">
            <h2><i className="fa-solid fa-tags"></i> 單字分類庫</h2>
            <p>建立與管理您的單字分類</p>
          </div>

          {/* Add Category Box */}
          <div className="add-category-box" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="新增分類名稱..." 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategorySubmit(); }}
              className="form-control"
              style={{ padding: '8px 12px', fontSize: '14px' }}
            />
            <button onClick={handleAddCategorySubmit} className="btn btn-primary" style={{ padding: '8px 14px' }} title="新增分類">
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>

          <div className="file-list-container">
            <div id="file-list" className="file-buttons-list">
              {isLoading && categories.length === 0 ? (
                <div className="file-list-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i> 正在讀取分類...
                </div>
              ) : categories.length === 0 ? (
                <div className="file-list-loading">
                  <i className="fa-solid fa-triangle-exclamation"></i> 尚未建立任何分類<br />
                  <span style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '5px', display: 'block' }}>
                    請在上方輸入名稱新增分類
                  </span>
                </div>
              ) : (
                categories.map((cat) => {
                  const isActive = cat.id === activeCategoryId;
                  return (
                    <div 
                      key={cat.id}
                      className={`category-item-wrapper ${isActive ? 'active' : ''}`}
                    >
                      {editingCategoryId === cat.id ? (
                        <div style={{ display: 'flex', width: '100%', padding: '4px', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="form-control"
                            style={{ padding: '6px 10px', fontSize: '13px', flexGrow: 1 }}
                            autoFocus
                          />
                          <button onClick={() => handleSaveCategoryEdit(cat.id)} className="btn btn-primary" style={{ padding: '6px 10px' }} title="儲存">
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button onClick={() => setEditingCategoryId('')} className="btn btn-secondary" style={{ padding: '6px 10px' }} title="取消">
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="file-btn"
                            onClick={() => {
                              if (isPlaying) handleStopPlayer();
                              onSelectCategory(cat.id);
                            }}
                            style={{ flexGrow: 1, border: 'none', background: 'transparent', width: '100%', padding: '12px 14px' }}
                          >
                            <i className="fa-regular fa-folder-open folder-icon"></i>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                          </button>
                          <div className="category-actions" style={{ display: 'flex', gap: '2px', paddingRight: '6px' }}>
                            <button onClick={() => handleStartCategoryEdit(cat)} className="btn-category-action" title="編輯名稱">
                              <i className="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button onClick={() => onDeleteCategory(cat.id)} className="btn-category-action delete-action" title="刪除分類">
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Words List */}
        <div className="card glass words-display-panel">
          <div className="card-header flex-header">
            <div className="words-header-info">
              <h2 id="active-file-title">{activeCategory ? activeCategory.name : '請選擇單字分類'}</h2>
              <p id="active-file-desc">
                {activeCategory 
                  ? isTranslating ? '正在寫入單字並翻譯...' : `此分類下共有 ${loadedVocabs.length} 個單字。`
                  : '請在左側點選分類以查看單字卡。'
                }
              </p>
            </div>

            {/* Player Controls */}
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

          {/* Add Word Box */}
          {activeCategoryId && (
            <div className="add-word-container glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}><i className="fa-solid fa-plus-circle"></i> 新增單字卡</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="英文單字/片語 (例如: schedule)..."
                  value={newWordEng}
                  onChange={(e) => setNewWordEng(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddWordSubmit(); }}
                  className="form-control"
                  style={{ flex: 1, minWidth: '150px' }}
                />
                <input
                  type="text"
                  placeholder="中文翻譯 (留空則自動透過 Google 翻譯)..."
                  value={newWordChi}
                  onChange={(e) => setNewWordChi(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddWordSubmit(); }}
                  className="form-control"
                  style={{ flex: 1, minWidth: '200px' }}
                />
                <button onClick={handleAddWordSubmit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isTranslating || !newWordEng.trim()}>
                  {isTranslating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                  <span>新增</span>
                </button>
              </div>
            </div>
          )}

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
                  const isEditing = editingVocabId === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`card-${item.id}`}
                      className={`vocab-card glass ${isWordPlaying ? 'active-playing' : ''}`}
                      style={{ display: 'flex', flexDirection: 'column', minHeight: '140px' }}
                    >
                      {isEditing ? (
                        <div className="vocab-card-edit-mode" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, justifyContent: 'center' }}>
                          <input 
                            type="text" 
                            value={editingWordEng} 
                            onChange={(e) => setEditingWordEng(e.target.value)} 
                            className="form-control"
                            style={{ padding: '6px 10px', fontSize: '14px' }}
                            placeholder="英文..."
                          />
                          <input 
                            type="text" 
                            value={editingWordChi} 
                            onChange={(e) => setEditingWordChi(e.target.value)} 
                            className="form-control"
                            style={{ padding: '6px 10px', fontSize: '14px' }}
                            placeholder="中文翻譯..."
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => handleSaveWordEdit(item.id)} className="btn btn-success btn-xs" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-check"></i> 儲存
                            </button>
                            <button onClick={() => setEditingVocabId('')} className="btn btn-secondary btn-xs" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-xmark"></i> 取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="vocab-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="tag-badge">雲端字卡</span>
                          </div>
                          
                          <div className="vocab-english-area" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 className="vocab-card-english" style={{ wordBreak: 'break-word', fontSize: '20px' }}>{item.english}</h3>
                            <button
                              className="btn-speak-vocab"
                              onClick={() => speak(item.english)}
                              style={{ flexShrink: 0 }}
                            >
                              <i className="fa-solid fa-volume-high"></i>
                            </button>
                          </div>
                          
                          <p
                            className={`vocab-card-chinese ${isBlurred ? 'blurred' : ''}`}
                            onClick={() => handleToggleCardBlur(item.id)}
                            style={{ margin: '8px 0', minHeight: '24px' }}
                          >
                            {item.chinese}
                          </p>

                          <div className="vocab-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: 'auto' }}>
                            <button 
                              onClick={() => handleStartWordEdit(item)} 
                              className="btn-card-action btn-edit" 
                              title="編輯單字"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            >
                              <i className="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button 
                              onClick={() => onDeleteWord(item.id)} 
                              className="btn-card-action btn-delete" 
                              title="刪除單字"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !isTranslating && (
                <div id="words-empty" className="empty-state glass">
                  <i className="fa-solid fa-file-circle-plus empty-icon"></i>
                  <h3>分類中尚無單字</h3>
                  <p>
                    {activeCategoryId 
                      ? '請在上方輸入英文與中文，為此分類新增第一個單字字卡！'
                      : '請先在左側選取或建立單字分類庫。'
                    }
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
