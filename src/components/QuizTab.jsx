import React, { useState, useEffect, useRef } from 'react';

export default function QuizTab({
  loadedVocabs,
  files,
  speak,
  showToast,
  onAssembleAllFilesVocabs
}) {
  // Quiz Configuration State
  const [quizMode, setQuizMode] = useState('spelling');
  const [quizScope, setQuizScope] = useState('all-files');
  const [quizCount, setQuizCount] = useState('10');
  const [autoPlay, setAutoPlay] = useState(true);
  const [readTwice, setReadTwice] = useState(true);
  const [isAssembling, setIsAssembling] = useState(false);

  // Active Quiz State
  const [quizActive, setQuizActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [scoreWrong, setScoreWrong] = useState(0);
  const [results, setResults] = useState([]);
  const [wrongsOnly, setWrongsOnly] = useState([]);
  
  // Question Answering State
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState({ show: false, isCorrect: false, text: '' });
  const [choiceOptions, setChoiceOptions] = useState([]);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const inputRef = useRef(null);

  // Auto-read question when loading
  useEffect(() => {
    if (quizActive && questions.length > 0 && currentIndex < questions.length) {
      const currentQuestion = questions[currentIndex];
      setFlashcardFlipped(false);
      setIsAnswered(false);
      setUserAnswer('');
      setFeedback({ show: false, isCorrect: false, text: '' });

      if (quizMode === 'choice') {
        generateChoiceOptions(currentQuestion);
      }

      if (autoPlay) {
        const timer = setTimeout(() => {
          speak(currentQuestion.english);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [quizActive, currentIndex, questions, quizMode, autoPlay]);

  // Focus spelling input
  useEffect(() => {
    if (quizActive && quizMode === 'spelling' && !isAnswered && inputRef.current) {
      inputRef.current.focus();
    }
  }, [quizActive, currentIndex, quizMode, isAnswered]);

  // Shuffle Helper (Fisher-Yates)
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Generate Multiple Choice Distractors
  const generateChoiceOptions = (question) => {
    let options = [question];
    
    // Distractors pool from the current quiz questions
    const distractorsPool = questions.filter(v => v.id !== question.id);
    const shuffledDistractors = shuffleArray(distractorsPool);
    const selectedDistractors = shuffledDistractors.slice(0, 3);
    
    options = [...options, ...selectedDistractors];

    // If still not enough options (e.g. quiz count is small), draw from loadedVocabs as fallback
    if (options.length < 4) {
      const loadedPool = loadedVocabs.filter(v => !options.some(opt => opt.id === v.id));
      const shuffledLoaded = shuffleArray(loadedPool);
      options = [...options, ...shuffledLoaded.slice(0, 4 - options.length)];
    }

    // If less than 4 options, pad with defaults
    while (options.length < 4) {
      options.push({
        id: `default-${Math.random()}`,
        english: `Option ${options.length + 1}`,
        chinese: '預設選項',
        wrongCount: 0,
        correctCount: 0
      });
    }

    setChoiceOptions(shuffleArray(options));
  };

  const handleStartQuiz = async (customPool = null) => {
    let pool = [];
    setIsAssembling(true);

    try {
      if (customPool) {
        pool = customPool;
      } else if (quizScope === 'all-files') {
        if (files.length === 0) {
          showToast("沒有任何檔案可供抽考！");
          setIsAssembling(false);
          return;
        }
        pool = await onAssembleAllFilesVocabs();
      } else {
        if (loadedVocabs.length === 0) {
          showToast("目前沒有載入任何單字，請先至第一頁載入檔案！");
          setIsAssembling(false);
          return;
        }
        pool = [...loadedVocabs];
      }

      if (pool.length === 0) {
        showToast("未找到任何有效單字！");
        setIsAssembling(false);
        return;
      }

      const shuffledPool = shuffleArray(pool);
      let limit = shuffledPool.length;
      if (quizCount !== 'all') {
        limit = Math.min(parseInt(quizCount), shuffledPool.length);
      }

      setQuestions(shuffledPool.slice(0, limit));
      setCurrentIndex(0);
      setScoreCorrect(0);
      setScoreWrong(0);
      setResults([]);
      setWrongsOnly([]);
      setIsAnswered(false);
      setUserAnswer('');
      setFeedback({ show: false, isCorrect: false, text: '' });
      setQuizActive(true);
    } catch (e) {
      console.error(e);
      showToast("初始化測驗時出錯！");
    } finally {
      setIsAssembling(false);
    }
  };

  const handleQuitQuiz = () => {
    if (window.confirm("考驗尚未完成，確認要退出並結束嗎？")) {
      setQuizActive(false);
      window.speechSynthesis.cancel();
    }
  };

  const recordResult = (vocab, userAns, isCorrect) => {
    setResults(prev => [...prev, { vocab, userAnswer: userAns, isCorrect }]);
    if (isCorrect) {
      setScoreCorrect(prev => prev + 1);
    } else {
      setScoreWrong(prev => prev + 1);
      setWrongsOnly(prev => [...prev, vocab]);
    }
  };

  // Spelling Mode Submit
  const handleSpellingSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAnswered) return;

    const trimmedAnswer = userAnswer.trim();
    const currentQuestion = questions[currentIndex];
    const correctAnswer = currentQuestion.english.trim();

    const formatText = text => text.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const isCorrect = formatText(trimmedAnswer) === formatText(correctAnswer);

    setIsAnswered(true);
    recordResult(currentQuestion, trimmedAnswer, isCorrect);
    
    setFeedback({
      show: true,
      isCorrect,
      text: isCorrect ? `答對了！答案確為: "${correctAnswer}"` : `答錯了，正確答案是: "${correctAnswer}"`
    });
  };

  // Flashcard Mode Evaluation
  const handleFlashcardRating = (isCorrect) => {
    const currentQuestion = questions[currentIndex];
    recordResult(currentQuestion, isCorrect ? "記住了" : "沒記住", isCorrect);
    
    handleNextQuestion();
  };

  // Choice Mode Selection
  const handleChoiceSelect = (selectedOpt) => {
    if (isAnswered) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOpt.id === currentQuestion.id;

    setIsAnswered(true);
    setUserAnswer(selectedOpt.english);
    recordResult(currentQuestion, selectedOpt.english, isCorrect);

    setFeedback({
      show: true,
      isCorrect,
      text: isCorrect ? `答對了！答案是: "${currentQuestion.english}"` : `答錯了，正確答案是: "${currentQuestion.english}"`
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Quiz Finished!
      setQuizActive(false);
      setCurrentIndex(questions.length); // Marks finish
    }
  };

  const handleRetryWrongs = () => {
    const wrongs = [...wrongsOnly];
    handleStartQuiz(wrongs);
  };

  const handleResetToSetup = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setScoreCorrect(0);
    setScoreWrong(0);
    setResults([]);
    setWrongsOnly([]);
  };

  // Render Setup Screen
  if (!quizActive && questions.length === 0) {
    return (
      <section id="quiz-tab" className="tab-panel active">
        <div id="quiz-setup" className="quiz-setup-container card glass">
          <div className="quiz-header">
            <i className="fa-solid fa-gamepad quiz-decor-icon"></i>
            <h2>英文智慧抽考</h2>
            <p id="quiz-setup-subtitle">
              {loadedVocabs.length > 0 
                ? `將使用目前載入的單字進行考驗 (${loadedVocabs.length} 個單字)`
                : '請先在第一頁選擇載入檔案，或在此進行歷史混合抽考'
              }
            </p>
          </div>

          <div className="quiz-setup-grid">
            {/* Select Mode */}
            <div className="setup-group">
              <label><i className="fa-solid fa-wand-magic-sparkles"></i> 選擇測驗模式</label>
              <div className="mode-options">
                <label className={`mode-card ${quizMode === 'spelling' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="quiz-mode" 
                    value="spelling" 
                    checked={quizMode === 'spelling'}
                    onChange={() => setQuizMode('spelling')}
                  />
                  <span className="mode-icon"><i className="fa-solid fa-keyboard"></i></span>
                  <span className="mode-title">聽力拼字測驗</span>
                  <span className="mode-desc">聽取英文發音，拼寫出正確英文</span>
                </label>

                <label className={`mode-card ${quizMode === 'choice' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="quiz-mode" 
                    value="choice" 
                    checked={quizMode === 'choice'}
                    onChange={() => setQuizMode('choice')}
                  />
                  <span className="mode-icon"><i className="fa-solid fa-list-check"></i></span>
                  <span className="mode-title">中文四選一測驗</span>
                  <span className="mode-desc">看中文提示，選擇正確的英文單字</span>
                </label>

                <label className={`mode-card ${quizMode === 'flashcard' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="quiz-mode" 
                    value="flashcard" 
                    checked={quizMode === 'flashcard'}
                    onChange={() => setQuizMode('flashcard')}
                  />
                  <span className="mode-icon"><i className="fa-solid fa-clone"></i></span>
                  <span className="mode-title">雙面字卡記憶</span>
                  <span className="mode-desc">看英文/中文翻牌，自我評估記憶熟練度</span>
                </label>
              </div>
            </div>

            {/* Select Options */}
            <div className="setup-side-panel">
              <div className="setup-group">
                <label htmlFor="quiz-scope"><i className="fa-solid fa-layer-group"></i> 抽考範圍</label>
                <select 
                  id="quiz-scope"
                  value={quizScope}
                  onChange={(e) => setQuizScope(e.target.value)}
                >
                  <option value="all-files">混合隨機抽考之前所有檔案 (預設)</option>
                  <option value="current-file">僅考目前載入的單字檔案</option>
                </select>
              </div>

              <div className="setup-group">
                <label htmlFor="quiz-count"><i className="fa-solid fa-arrow-down-9-1"></i> 抽考題數</label>
                <select 
                  id="quiz-count"
                  value={quizCount}
                  onChange={(e) => setQuizCount(e.target.value)}
                >
                  <option value="5">5 題</option>
                  <option value="10">10 題</option>
                  <option value="20">20 題</option>
                  <option value="all">所有單字</option>
                </select>
              </div>

              <div className="setup-group checkbox-group">
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="quiz-auto-play"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">題目載入時自動朗讀</span>
                </label>
              </div>

              <div className="setup-group checkbox-group">
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="quiz-read-twice"
                    checked={readTwice}
                    onChange={(e) => setReadTwice(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">考試跟讀模式 (朗讀兩次)</span>
                </label>
              </div>

              <button 
                id="btn-start-quiz" 
                onClick={() => handleStartQuiz()}
                className="btn btn-primary btn-block btn-lg"
                disabled={isAssembling || (quizScope === 'current-file' && loadedVocabs.length === 0)}
              >
                {isAssembling ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> 正在彙整單字...</>
                ) : (
                  <><i className="fa-solid fa-play"></i> 開始考驗</>
                )}
              </button>
              
              {quizScope === 'current-file' && loadedVocabs.length === 0 && (
                <div id="start-quiz-hint" className="start-quiz-hint">
                  請先在第一頁載入檔案，或切換範圍為「混合隨機抽考」
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Render Quiz Arena
  if (quizActive && questions.length > 0) {
    const currentQuestion = questions[currentIndex];
    const progressPercent = (currentIndex / questions.length) * 100;

    return (
      <section id="quiz-tab" className="tab-panel active">
        <div id="quiz-arena" className="quiz-arena-container card glass">
          {/* Quiz Top bar stats */}
          <div className="quiz-arena-header">
            <div className="quiz-progress-wrapper">
              <span className="quiz-progress-text">
                第 <span id="quiz-current-index">{currentIndex + 1}</span> 題 / 共 <span id="quiz-total-questions">{questions.length}</span> 題
              </span>
              <div className="progress-bar-bg">
                <div 
                  id="quiz-progress-fill" 
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="quiz-score-badge">
              <i className="fa-solid fa-check"></i> <span id="quiz-score-correct">{scoreCorrect}</span>
              <span className="divider">|</span>
              <i className="fa-solid fa-xmark"></i> <span id="quiz-score-wrong">{scoreWrong}</span>
            </div>
            <button 
              id="btn-quit-quiz" 
              onClick={handleQuitQuiz}
              className="btn btn-secondary-outline btn-sm"
              style={{ marginLeft: '12px' }}
            >
              <i className="fa-solid fa-circle-xmark"></i> 結束
            </button>
          </div>

          {/* Spelling Mode Card */}
          {quizMode === 'spelling' && (
            <div className="quiz-card-wrapper">
              <div id="quiz-card-spelling" className="quiz-play-card">
                <div className="audio-prompt-section">
                  <button 
                    id="btn-quiz-speak" 
                    onClick={() => speak(currentQuestion.english)}
                    className="btn-voice-large"
                    title="朗讀發音"
                  >
                    <i className="fa-solid fa-volume-high"></i>
                  </button>
                  <span className="audio-hint-text">點擊朗讀發音</span>
                </div>
                
                <div className="chinese-clue">
                  <span className="clue-tag">中文提示</span>
                  <span className="chinese-text">{currentQuestion.chinese}</span>
                </div>

                <form onSubmit={handleSpellingSubmit} className="input-answer-section">
                  <input
                    type="text"
                    id="quiz-spelling-input"
                    ref={inputRef}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="在此輸入拼寫英文..."
                    disabled={isAnswered}
                    autoComplete="off"
                  />
                  {!isAnswered ? (
                    <button 
                      type="submit" 
                      id="btn-spelling-submit" 
                      className="btn btn-primary"
                    >
                      送出答案
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleNextQuestion} 
                      className="btn btn-primary"
                    >
                      下一題 <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Choice Mode Card */}
          {quizMode === 'choice' && (
            <div className="quiz-card-wrapper">
              <div id="quiz-card-choice" className="quiz-play-card">
                <div className="choice-question-header">
                  <button 
                    id="btn-choice-speak" 
                    onClick={() => speak(currentQuestion.english)}
                    className="btn-voice-medium"
                    title="朗讀發音"
                  >
                    <i className="fa-solid fa-volume-high"></i>
                  </button>
                  <div className="choice-clue-box">
                    <span className="clue-tag">中文提示</span>
                    <h3 id="choice-question-title" className="choice-title">
                      {currentQuestion.chinese}
                    </h3>
                  </div>
                </div>

                <div className="choice-options-grid">
                  {choiceOptions.map((opt) => {
                    const isCorrectOption = opt.id === currentQuestion.id;
                    let btnClass = 'choice-btn';
                    
                    if (isAnswered) {
                      if (isCorrectOption) {
                        btnClass += ' correct';
                      } else if (userAnswer === opt.english) {
                        btnClass += ' incorrect';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        className={btnClass}
                        onClick={() => handleChoiceSelect(opt)}
                        disabled={isAnswered}
                      >
                        {opt.english}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button 
                      onClick={handleNextQuestion} 
                      className="btn btn-primary"
                    >
                      下一題 <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flashcard Mode Card */}
          {quizMode === 'flashcard' && (
            <div className="quiz-card-wrapper">
              <div id="quiz-card-flashcard" className="quiz-play-card">
                <div 
                  id="flashcard-3d" 
                  className={`flashcard-3d ${flashcardFlipped ? 'flipped' : ''}`}
                  onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                >
                  <div className="glass-card flashcard-front">
                    <span className="card-side-label">Front (英文)</span>
                    <div className="flashcard-content">
                      <h3 className="flash-eng">{currentQuestion.english}</h3>
                      <button 
                        id="btn-flashcard-speak" 
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentQuestion.english);
                        }}
                        className="btn-speak-card"
                        title="朗讀發音"
                      >
                        <i className="fa-solid fa-volume-high"></i>
                      </button>
                    </div>
                    <span className="tap-hint">
                      <i className="fa-solid fa-arrows-rotate"></i> 點擊卡片以翻面看中文
                    </span>
                  </div>
                  
                  <div className="glass-card flashcard-back">
                    <span className="card-side-label">Back (中文)</span>
                    <div className="flashcard-content">
                      <h3 className="flash-chi">{currentQuestion.chinese}</h3>
                    </div>
                    <span className="tap-hint">
                      <i className="fa-solid fa-arrows-rotate"></i> 點擊卡片可翻回正面
                    </span>
                  </div>
                </div>

                <div 
                  id="flashcard-actions" 
                  className={`flashcard-controls ${flashcardFlipped ? '' : 'hidden'}`}
                >
                  <span className="action-question">您記住這個單字了嗎？</span>
                  <div className="action-buttons">
                    <button 
                      id="btn-flash-wrong" 
                      onClick={() => handleFlashcardRating(false)}
                      className="btn btn-danger-outline"
                    >
                      <i className="fa-solid fa-face-frown"></i> 沒記住
                    </button>
                    <button 
                      id="btn-flash-correct" 
                      onClick={() => handleFlashcardRating(true)}
                      className="btn btn-success"
                    >
                      <i className="fa-solid fa-face-smile"></i> 記住了
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback banner */}
          {feedback.show && (
            <div 
              id="quiz-feedback" 
              className={`quiz-feedback-banner ${feedback.isCorrect ? 'correct-banner' : 'incorrect-banner'}`}
            >
              <div className="feedback-icon-box">
                {feedback.isCorrect ? (
                  <i className="fa-solid fa-circle-check"></i>
                ) : (
                  <i className="fa-solid fa-circle-xmark"></i>
                )}
              </div>
              <div className="feedback-content">
                <h4 id="feedback-title">
                  {feedback.isCorrect ? '答對了！非常棒！' : '答錯了，再加把勁！'}
                </h4>
                <p id="feedback-detail">{feedback.text}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Render Quiz Results Screen
  if (!quizActive && currentIndex > 0 && questions.length > 0) {
    const correctPercent = questions.length > 0 ? Math.round((scoreCorrect / questions.length) * 100) : 0;
    return (
      <section id="quiz-tab" className="tab-panel active">
        <div id="quiz-results" className="quiz-results-container card glass">
          <div className="results-header">
            <div className="trophy-box">
              <i className="fa-solid fa-trophy trophy-icon"></i>
            </div>
            <h2>考驗完成！</h2>
            <p>這是您本次智慧抽考的學習成果報告</p>
          </div>

          <div className="results-score-panel">
            <div className="result-stat">
              <span id="result-score" className="result-number">
                {scoreCorrect} / {questions.length}
              </span>
              <span className="result-label">最終得分</span>
            </div>
            <div className="result-stat">
              <span id="result-percent" className="result-number" style={{ color: 'var(--accent)' }}>
                {correctPercent}%
              </span>
              <span className="result-label">答對率</span>
            </div>
          </div>

          {/* Wrongs retry section */}
          {wrongsOnly.length > 0 && (
            <div className="wrongs-action-box glass" style={{ marginTop: '30px' }}>
              <p>
                本次測驗中您共有 <strong><span id="retry-count">{wrongsOnly.length}</span></strong> 個單字答錯或未記住。
                建議立即進行針對性重試，直到完全掌握！
              </p>
              <button 
                id="btn-retry-wrongs" 
                onClick={handleRetryWrongs}
                className="btn btn-danger btn-lg"
                style={{ marginTop: '16px' }}
              >
                <i className="fa-solid fa-arrows-spin"></i> 立即重試錯題
              </button>
            </div>
          )}

          {/* Results table */}
          <div className="results-details" style={{ marginTop: '40px' }}>
            <h3>測驗詳情與錯題覆盤</h3>
            <div className="results-list-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>英文單字 / 句子</th>
                    <th>中文翻譯</th>
                    <th>您的回答</th>
                    <th>結果狀態</th>
                  </tr>
                </thead>
                <tbody id="results-table-body">
                  {results.map((res, index) => (
                    <tr key={index}>
                      <td><strong>{res.vocab.english}</strong></td>
                      <td>{res.vocab.chinese}</td>
                      <td>{res.userAnswer || '--'}</td>
                      <td>
                        {res.isCorrect ? (
                          <span className="result-tag-correct"><i className="fa-solid fa-check"></i> 答對</span>
                        ) : (
                          <span className="result-tag-wrong"><i className="fa-solid fa-xmark"></i> 答錯</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="results-footer" style={{ marginTop: '30px' }}>
            <button 
              id="btn-finish-results" 
              onClick={handleResetToSetup}
              className="btn btn-secondary btn-block"
            >
              返回準備畫面
            </button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

