// 唯一預設值設定處 (Change here to modify all default settings!)
const DEFAULTS = {
  rate: 0.75,   // 預設語速 (Default speed rate)
  pitch: 1.0,  // 預設音調 (Default pitch)
  theme: 'dark' // 預設主題 (Default theme: 'dark' or 'light')
};

// App State Management
const STATE = {
  files: [],
  localFiles: {}, // key: filename, value: content string
  activeFileName: '',
  loadedVocabs: [], // array of { id, english, chinese, wrongCount: 0, correctCount: 0 }
  settings: {
    voiceURI: '',
    rate: DEFAULTS.rate,
    pitch: DEFAULTS.pitch,
    theme: DEFAULTS.theme
  },
  currentQuiz: {
    active: false,
    mode: 'spelling', // spelling, flashcard, choice
    count: 10,
    questions: [],
    currentIndex: 0,
    scoreCorrect: 0,
    scoreWrong: 0,
    results: [], // { vocab, userAnswer, isCorrect }
    wrongsOnly: [],
    isAnswered: false,
    autoPlay: true
  }
};

// Core Speech Engine Voices Cache
let availableVoices = [];

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTTS();
  initTabs();
  loadSettings();
  loadSettingsPanelValues(); // Sync settings panel UI with initial defaults
  refreshFileList();
  setupEventListeners();
});

// Load Settings from Local Storage
function loadSettings() {
  const localSettings = localStorage.getItem("engflow_settings_v2");
  if (localSettings) {
    STATE.settings = { ...STATE.settings, ...JSON.parse(localSettings) };
  }
}

function saveSettingsToLocalStorage() {
  localStorage.setItem("engflow_settings_v2", JSON.stringify(STATE.settings));
}

// Theme Handling
function initTheme() {
  const body = document.body;
  const themeToggle = document.getElementById("theme-toggle");

  if (STATE.settings.theme === 'light') {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById("theme-toggle");

  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    STATE.settings.theme = 'light';
  } else {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    STATE.settings.theme = 'dark';
  }
  saveSettingsToLocalStorage();
  showToast("主題已切換");
}

// Navigation / Tabs Routing
function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetPanelId = tab.getAttribute("data-tab");
      switchTab(targetPanelId);
    });
  });
}

function switchTab(panelId) {
  // Update Navigation Active State
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    if (tab.getAttribute("data-tab") === panelId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Switch Active Panel
  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach(panel => {
    if (panel.id === panelId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  // Action hook on tab transition
  if (panelId === 'settings-tab') {
    loadSettingsPanelValues();
  }
}

// Text-to-Speech Engine
function initTTS() {
  const synth = window.speechSynthesis;

  const loadVoices = () => {
    let voices = synth.getVoices().filter(voice => voice.lang.toLowerCase().includes('en'));

    // Prioritize local offline voices (e.g. Microsoft David) over network/online streaming voices (e.g. Google US English)
    voices.sort((a, b) => {
      const aLocal = a.localService === true;
      const bLocal = b.localService === true;
      if (aLocal && !bLocal) return -1;
      if (!aLocal && bLocal) return 1;
      return 0;
    });

    availableVoices = voices;
    populateVoiceSelect();
  };

  loadVoices();
  // Chrome loads voices asynchronously
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

function populateVoiceSelect() {
  const voiceSelect = document.getElementById("settings-voice");
  if (!voiceSelect) return;

  voiceSelect.innerHTML = "";

  if (availableVoices.length === 0) {
    voiceSelect.innerHTML = `<option value="">無可用英文語音 (請確認裝置設定)</option>`;
    return;
  }

  availableVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.voiceURI === STATE.settings.voiceURI) {
      option.selected = true;
    }
    voiceSelect.appendChild(option);
  });
}

function speak(text, callback) {
  const synth = window.speechSynthesis;
  if (!synth) {
    showToast("您的瀏覽器不支援語音合成！");
    return;
  }

  // Cancel current speech before playing next
  synth.cancel();

  if (!text) return;

  // A tiny timeout prevents Chrome from dropping the speak command after cancel()
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Force English voice engine

    // Set voice
    let voice = availableVoices.find(v => v.voiceURI === STATE.settings.voiceURI);
    if (!voice && availableVoices.length > 0) {
      voice = availableVoices[0];
    }
    if (voice) {
      utterance.voice = voice;
      console.log(`[TTS] Speaking using voice: ${voice.name} (${voice.lang})`);
    } else {
      console.log(`[TTS] Speaking using browser default voice`);
    }

    // Set parameters
    utterance.rate = STATE.settings.rate;
    utterance.pitch = STATE.settings.pitch;

    utterance.onend = () => {
      console.log(`[TTS] Speech finished: "${text}"`);
      if (callback) callback();
    };

    utterance.onerror = (event) => {
      console.error('[TTS] Speech error:', event.error, event);
      let errorMsg = event.error;
      if (errorMsg === 'not-allowed') {
        errorMsg = '瀏覽器阻擋播放 (請先在頁面任一處點選以允許音效)';
      } else if (errorMsg === 'audio-busy') {
        errorMsg = '音訊裝置忙碌中';
      } else if (errorMsg === 'network') {
        errorMsg = '網路連線異常 (部分網路語音載入失敗)';
      }
      showToast(`語音朗讀失敗: ${errorMsg}`);
      if (callback) callback();
    };

    synth.speak(utterance);
  }, 50);
}

// Load Settings inputs
function loadSettingsPanelValues() {
  populateVoiceSelect();
  document.getElementById("settings-rate").value = STATE.settings.rate;
  document.getElementById("rate-value").textContent = `${STATE.settings.rate}x`;
  document.getElementById("settings-pitch").value = STATE.settings.pitch;
  document.getElementById("pitch-value").textContent = STATE.settings.pitch;
}

// Save Settings from UI
function saveSettings() {
  const voiceURI = document.getElementById("settings-voice").value;
  const rate = parseFloat(document.getElementById("settings-rate").value);
  const pitch = parseFloat(document.getElementById("settings-pitch").value);

  STATE.settings.voiceURI = voiceURI;
  STATE.settings.rate = rate;
  STATE.settings.pitch = pitch;

  saveSettingsToLocalStorage();
  showToast("設定已儲存");
}

function resetSettings() {
  STATE.settings.voiceURI = availableVoices.length > 0 ? availableVoices[0].voiceURI : '';
  STATE.settings.rate = DEFAULTS.rate;
  STATE.settings.pitch = DEFAULTS.pitch;

  loadSettingsPanelValues();
  saveSettingsToLocalStorage();
  showToast("已重設為預設值");
}

// UI Elements & Event Listeners
function setupEventListeners() {
  // Theme Toggle
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  // Refresh files list
  document.getElementById("btn-refresh-files").addEventListener("click", refreshFileList);

  // Settings
  document.getElementById("settings-rate").addEventListener("input", (e) => {
    document.getElementById("rate-value").textContent = `${e.target.value}x`;
  });
  document.getElementById("settings-pitch").addEventListener("input", (e) => {
    document.getElementById("pitch-value").textContent = e.target.value;
  });
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
  document.getElementById("btn-reset-settings").addEventListener("click", resetSettings);
  document.getElementById("btn-test-speak").addEventListener("click", () => {
    const text = document.getElementById("tts-test-text").value;
    speak(text);
  });

  // Quiz setups and controls
  document.getElementById("btn-start-quiz").addEventListener("click", startQuiz);
  document.getElementById("btn-quit-quiz").addEventListener("click", quitQuiz);
  document.getElementById("btn-finish-results").addEventListener("click", () => {
    document.getElementById("quiz-results").classList.add("hidden");
    document.getElementById("quiz-setup").classList.remove("hidden");
  });

  // Spelling inputs
  document.getElementById("btn-quiz-speak").addEventListener("click", () => {
    const question = STATE.currentQuiz.questions[STATE.currentQuiz.currentIndex];
    if (question) speak(question.english);
  });
  document.getElementById("quiz-spelling-input").addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
      submitSpellingAnswer();
    }
  });
  document.getElementById("btn-spelling-submit").addEventListener("click", submitSpellingAnswer);

  // Flashcards flip
  document.getElementById("flashcard-3d").addEventListener("click", () => {
    const card = document.getElementById("flashcard-3d");
    card.classList.toggle("flipped");

    if (card.classList.contains("flipped")) {
      document.getElementById("flashcard-actions").classList.remove("hidden");
    } else {
      document.getElementById("flashcard-actions").classList.add("hidden");
    }
  });

  document.getElementById("btn-flashcard-speak").addEventListener("click", (e) => {
    e.stopPropagation();
    const question = STATE.currentQuiz.questions[STATE.currentQuiz.currentIndex];
    if (question) speak(question.english);
  });

  document.getElementById("btn-flash-correct").addEventListener("click", () => handleFlashcardRating(true));
  document.getElementById("btn-flash-wrong").addEventListener("click", () => handleFlashcardRating(false));

  // Multi-choice voices
  document.getElementById("btn-choice-speak").addEventListener("click", () => {
    const question = STATE.currentQuiz.questions[STATE.currentQuiz.currentIndex];
    if (question) speak(question.english);
  });

  // Next question
  document.getElementById("btn-next-question").addEventListener("click", loadNextQuestion);

  // Retry wrongs
  document.getElementById("btn-retry-wrongs").addEventListener("click", retryWrongQuestions);

  // Local File Loading
  const localFileInput = document.getElementById("local-file-input");
  const btnSelectLocalFile = document.getElementById("btn-select-local-file");
  if (btnSelectLocalFile && localFileInput) {
    btnSelectLocalFile.addEventListener("click", () => {
      localFileInput.click();
    });
    localFileInput.addEventListener("change", handleLocalFilesUpload);
  }
}

// Handle local file uploads
function handleLocalFilesUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  let loadedCount = 0;
  const targetCount = files.length;
  let lastLoadedName = '';

  Array.from(files).forEach(file => {
    if (!file.name.endsWith('.txt')) {
      showToast(`不支援的檔案格式: ${file.name} (僅支援 .txt)`);
      loadedCount++;
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      STATE.localFiles[file.name] = content;
      
      if (!STATE.files.includes(file.name)) {
        STATE.files.unshift(file.name);
      }
      
      lastLoadedName = file.name;
      loadedCount++;
      
      if (loadedCount === targetCount) {
        refreshFileList();
        if (lastLoadedName) {
          loadFile(lastLoadedName);
        }
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      showToast(`讀取檔案失敗: ${file.name}`);
      loadedCount++;
      if (loadedCount === targetCount) {
        refreshFileList();
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

// Toast Notifications
function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  toastMessage.textContent = message;
  toast.classList.remove("hidden");

  if (window.toastTimeout) clearTimeout(window.toastTimeout);

  window.toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

// Fetch Files list from server and combine with local files
async function refreshFileList() {
  const fileListEl = document.getElementById("file-list");
  fileListEl.innerHTML = `<div class="file-list-loading"><i class="fa-solid fa-spinner fa-spin"></i> 正在讀取檔案...</div>`;

  let serverFiles = [];
  let fetchFailed = false;

  try {
    const response = await fetch('/api/files');
    if (!response.ok) throw new Error("HTTP error " + response.status);
    serverFiles = await response.json();
  } catch (error) {
    console.error("Failed to load files from server:", error);
    fetchFailed = true;
  }

  // Combine server files and local files (avoiding duplicates)
  const localFileNames = Object.keys(STATE.localFiles);
  
  // Maintain a clean unique files array
  const allFiles = [...localFileNames];
  serverFiles.forEach(file => {
    if (!allFiles.includes(file)) {
      allFiles.push(file);
    }
  });
  
  STATE.files = allFiles;

  if (allFiles.length === 0) {
    if (fetchFailed) {
      fileListEl.innerHTML = `<div class="file-list-loading error-text"><i class="fa-solid fa-triangle-exclamation"></i> 未連接伺服器<br><span style="font-size: 0.85em; opacity: 0.8; margin-top: 5px; display: block;">請點選下方載入本機單字檔 (.txt)</span></div>`;
    } else {
      fileListEl.innerHTML = `<div class="file-list-loading">在 data/ 中找不到 .txt 檔案，請載入本機單字檔</div>`;
    }
    return;
  }

  fileListEl.innerHTML = "";
  allFiles.forEach(file => {
    const isLocal = localFileNames.includes(file);
    const btn = document.createElement("button");
    btn.className = `file-btn ${file === STATE.activeFileName ? 'active' : ''}`;
    
    if (isLocal) {
      btn.innerHTML = `<i class="fa-regular fa-file-code" style="color: var(--accent-light, #818cf8);"></i> ${file} <span style="font-size: 0.75em; opacity: 0.7; margin-left: auto; padding-left: 5px;">(本機)</span>`;
    } else {
      btn.innerHTML = `<i class="fa-regular fa-file-lines"></i> ${file}`;
    }
    
    btn.addEventListener("click", () => loadFile(file));
    fileListEl.appendChild(btn);
  });

  // AUTOMATICALLY LOAD THE FIRST FILE ON INITIAL STARTUP IF NONE ACTIVE!
  if (!STATE.activeFileName && allFiles.length > 0) {
    loadFile(allFiles[0]);
  }
}

// Load selected file contents and fetch Google translations
async function loadFile(fileName) {
  // Update active file buttons
  const buttons = document.querySelectorAll(".file-btn");
  buttons.forEach(btn => {
    if (btn.textContent.trim() === fileName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  STATE.activeFileName = fileName;
  document.getElementById("active-file-title").textContent = fileName;
  document.getElementById("active-file-desc").textContent = "正在讀取檔案內容...";

  // Show loaders, hide empty states and old lists
  document.getElementById("translation-loader").classList.remove("hidden");
  document.getElementById("words-empty").classList.add("hidden");
  document.getElementById("loaded-words-list").innerHTML = "";

  // Disable Quiz button during load
  document.getElementById("btn-start-quiz").disabled = true;
  document.getElementById("start-quiz-hint").classList.remove("hidden");
  document.getElementById("start-quiz-hint").textContent = "正在載入單字翻譯，請稍後...";

  try {
    let text = '';
    if (STATE.localFiles[fileName] !== undefined) {
      text = STATE.localFiles[fileName];
    } else {
      const response = await fetch(`/api/file?name=${encodeURIComponent(fileName)}`);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      text = await response.text();
    }

    const lines = text.split(/\r?\n/);
    const phrasesToTranslate = [];
    const parsedItems = [];

    // Parse lines
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return; // skip empty and comment lines

      // Check if manual translation is supplied via "|" or "-"
      let english = '';
      let chinese = '';

      if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        english = parts[0].trim();
        chinese = parts[1].trim();
      } else if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        english = parts[0].trim();
        chinese = parts[1].trim();
      } else {
        english = trimmed;
        // Mark for Google translation
        phrasesToTranslate.push(english);
      }

      if (english) {
        parsedItems.push({
          id: `vocab-${index}-${Date.now()}`,
          english,
          chinese, // may be empty, to be populated from dictionary
          wrongCount: 0,
          correctCount: 0
        });
      }
    });

    if (parsedItems.length === 0) {
      document.getElementById("active-file-desc").textContent = "此檔案為空或無有效單字。";
      document.getElementById("translation-loader").classList.add("hidden");
      document.getElementById("words-empty").classList.remove("hidden");
      document.getElementById("start-quiz-hint").textContent = "此檔案無單字可供抽考。";
      return;
    }

    // Translate if needed
    document.getElementById("translation-progress").textContent = `0/${phrasesToTranslate.length}`;
    const translationDictionary = await translatePhrasesBatch(phrasesToTranslate);

    // Populate translations
    parsedItems.forEach(item => {
      if (!item.chinese) {
        const key = item.english.trim().toLowerCase();
        item.chinese = translationDictionary[key] || "（未能取得翻譯）";
      }
    });

    STATE.loadedVocabs = parsedItems;

    // Enable Quiz
    document.getElementById("btn-start-quiz").disabled = false;
    document.getElementById("start-quiz-hint").classList.add("hidden");
    document.getElementById("quiz-setup-subtitle").innerHTML = `將使用目前載入的 <strong>${fileName}</strong> (${parsedItems.length} 個單字) 進行考驗`;

    // Render in UI
    document.getElementById("translation-loader").classList.add("hidden");
    document.getElementById("active-file-desc").textContent = `成功載入 ${parsedItems.length} 個單字。`;
    renderLoadedWords();
    showToast(`成功載入 ${fileName}`);
  } catch (error) {
    console.error("Failed to load file contents:", error);
    document.getElementById("active-file-desc").textContent = "載入檔案失敗。";
    document.getElementById("translation-loader").classList.add("hidden");
    document.getElementById("start-quiz-hint").textContent = "載入失敗，無法開始考驗。";
    showToast("檔案載入失敗！");
  }
}

// Google Translate Batch Handler (CORS-friendly, gtx client)
async function translatePhrasesBatch(phrases) {
  if (phrases.length === 0) return {};

  const batchSize = 35; // Safe chunk size to avoid URL length limit
  const translations = {};

  for (let i = 0; i < phrases.length; i += batchSize) {
    const batch = phrases.slice(i, i + batchSize);

    // Update progress in UI
    document.getElementById("translation-progress").textContent = `${i}/${phrases.length}`;

    const textToTranslate = batch.join('\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(textToTranslate)}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        data[0].forEach(item => {
          if (item && item[0] && item[1]) {
            const orig = item[1].trim();
            const trans = item[0].trim();

            const origParts = orig.split('\n');
            const transParts = trans.split('\n');

            for (let j = 0; j < Math.min(origParts.length, transParts.length); j++) {
              const o = origParts[j].trim().toLowerCase();
              const t = transParts[j].trim();
              if (o) {
                translations[o] = t;
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Translation error for batch:', batch, e);
    }
  }

  return translations;
}

// Render Words in Main Column
function renderLoadedWords() {
  const container = document.getElementById("loaded-words-list");
  container.innerHTML = "";

  STATE.loadedVocabs.forEach(item => {
    const card = document.createElement("div");
    card.className = "vocab-card glass";

    card.innerHTML = `
      <div class="vocab-card-header">
        <span class="tag-badge">每日英文</span>
      </div>
      <div class="vocab-english-area">
        <h3 class="vocab-card-english">${item.english}</h3>
        <button class="btn-speak-vocab" onclick="speak('${escapeQuote(item.english)}')">
          <i class="fa-solid fa-volume-high"></i>
        </button>
      </div>
      <p class="vocab-card-chinese">${item.chinese}</p>
    `;
    container.appendChild(card);
  });
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

function toggleBlur(element) {
  element.classList.toggle("blurred");
}

// Start Quiz logic
async function startQuiz() {
  const scope = document.getElementById("quiz-scope").value;
  const mode = document.querySelector('input[name="quiz-mode"]:checked').value;
  const countVal = document.getElementById("quiz-count").value;
  const autoPlay = document.getElementById("quiz-auto-play").checked;

  let pool = [];

  if (scope === 'all-files') {
    if (STATE.files.length === 0) {
      showToast("沒有任何檔案可供抽考！");
      return;
    }

    // Disable start quiz button to show loading status
    const startBtn = document.getElementById("btn-start-quiz");
    startBtn.disabled = true;
    const originalText = startBtn.innerHTML;
    startBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在彙整歷史單字...`;

    try {
      let combinedItems = [];
      const phrasesToTranslate = [];

      // Fetch all files asynchronously
      const fetchPromises = STATE.files.map(async (file) => {
        try {
          let text = '';
          if (STATE.localFiles[file] !== undefined) {
            text = STATE.localFiles[file];
          } else {
            const res = await fetch(`/api/file?name=${encodeURIComponent(file)}`);
            if (!res.ok) return [];
            text = await res.text();
          }
          const lines = text.split(/\r?\n/);
          const fileItems = [];

          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            let english = '';
            let chinese = '';

            if (trimmed.includes('|')) {
              const parts = trimmed.split('|');
              english = parts[0].trim();
              chinese = parts[1].trim();
            } else if (trimmed.includes('-')) {
              const parts = trimmed.split('-');
              english = parts[0].trim();
              chinese = parts[1].trim();
            } else {
              english = trimmed;
            }

            if (english) {
              fileItems.push({
                english,
                chinese,
                index
              });
            }
          });
          return fileItems;
        } catch (err) {
          console.error("Error reading file:", file, err);
          return [];
        }
      });

      const allFilesResults = await Promise.all(fetchPromises);

      // Flatten results
      allFilesResults.forEach((fileItems) => {
        fileItems.forEach(item => {
          combinedItems.push(item);
          if (!item.chinese && !phrasesToTranslate.includes(item.english)) {
            phrasesToTranslate.push(item.english);
          }
        });
      });

      if (combinedItems.length === 0) {
        showToast("所有檔案中都沒有找到英文單字！");
        startBtn.disabled = false;
        startBtn.innerHTML = originalText;
        return;
      }

      // Batch translate if there are untranslated words
      let translationDictionary = {};
      if (phrasesToTranslate.length > 0) {
        showToast(`正在透過 Google 翻譯 ${phrasesToTranslate.length} 個歷史單字...`);
        translationDictionary = await translatePhrasesBatch(phrasesToTranslate);
      }

      // Format final vocabulary list with unique english values
      const seenEnglish = new Set();
      combinedItems.forEach((item, idx) => {
        const engKey = item.english.trim().toLowerCase();
        if (seenEnglish.has(engKey)) return;
        seenEnglish.add(engKey);

        let finalChinese = item.chinese;
        if (!finalChinese) {
          finalChinese = translationDictionary[engKey] || "（未能取得翻譯）";
        }

        pool.push({
          id: `vocab-mix-${idx}-${Date.now()}`,
          english: item.english,
          chinese: finalChinese,
          wrongCount: 0,
          correctCount: 0
        });
      });

    } catch (error) {
      console.error("Error generating mixed quiz pool:", error);
      showToast("載入歷史單字時出錯！");
      startBtn.disabled = false;
      startBtn.innerHTML = originalText;
      return;
    } finally {
      startBtn.disabled = false;
      startBtn.innerHTML = originalText;
    }
  } else {
    // current-file
    if (STATE.loadedVocabs.length === 0) {
      showToast("目前沒有載入任何單字，請先至第一頁載入檔案！");
      return;
    }
    pool = [...STATE.loadedVocabs];
  }

  // Shuffle and set current quiz
  shuffleArray(pool);

  let limit = pool.length;
  if (countVal !== 'all') {
    limit = Math.min(parseInt(countVal), pool.length);
  }

  STATE.currentQuiz = {
    active: true,
    mode,
    count: limit,
    questions: pool.slice(0, limit),
    currentIndex: 0,
    scoreCorrect: 0,
    scoreWrong: 0,
    results: [],
    wrongsOnly: [],
    isAnswered: false,
    autoPlay
  };

  // Adjust display panels
  document.getElementById("quiz-setup").classList.add("hidden");
  document.getElementById("quiz-arena").classList.remove("hidden");
  document.getElementById("quiz-results").classList.add("hidden");

  // Show proper quiz card based on mode
  document.getElementById("quiz-card-spelling").classList.add("hidden");
  document.getElementById("quiz-card-flashcard").classList.add("hidden");
  document.getElementById("quiz-card-choice").classList.add("hidden");

  if (mode === 'spelling') {
    document.getElementById("quiz-card-spelling").classList.remove("hidden");
  } else if (mode === 'flashcard') {
    document.getElementById("quiz-card-flashcard").classList.remove("hidden");
  } else if (mode === 'choice') {
    document.getElementById("quiz-card-choice").classList.remove("hidden");
  }

  document.getElementById("quiz-total-questions").textContent = STATE.currentQuiz.count;
  document.getElementById("quiz-score-correct").textContent = "0";
  document.getElementById("quiz-score-wrong").textContent = "0";

  loadQuestion();
}

function quitQuiz() {
  if (confirm("考驗尚未完成，確認要退出並結束嗎？")) {
    document.getElementById("quiz-arena").classList.add("hidden");
    document.getElementById("quiz-setup").classList.remove("hidden");
  }
}

// Fisher-Yates shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function loadQuestion() {
  const quiz = STATE.currentQuiz;
  const question = quiz.questions[quiz.currentIndex];
  quiz.isAnswered = false;

  document.getElementById("quiz-feedback").classList.add("hidden");

  // Update Progress
  document.getElementById("quiz-current-index").textContent = quiz.currentIndex + 1;
  const progressPercent = ((quiz.currentIndex) / quiz.count) * 100;
  document.getElementById("quiz-progress-fill").style.width = `${progressPercent}%`;

  if (quiz.mode === 'spelling') {
    setupSpellingQuestion(question);
  } else if (quiz.mode === 'flashcard') {
    setupFlashcardQuestion(question);
  } else if (quiz.mode === 'choice') {
    setupChoiceQuestion(question);
  }

  if (quiz.autoPlay) {
    setTimeout(() => {
      speak(question.english);
    }, 300);
  }
}

// Spelling Mode
function setupSpellingQuestion(question) {
  const input = document.getElementById("quiz-spelling-input");
  input.value = "";
  input.disabled = false;
  input.focus();

  document.getElementById("btn-spelling-submit").disabled = false;
  document.getElementById("spelling-chinese-hint").textContent = question.chinese;
}

function submitSpellingAnswer() {
  const quiz = STATE.currentQuiz;
  if (quiz.isAnswered) return;

  const inputEl = document.getElementById("quiz-spelling-input");
  const userAnswer = inputEl.value.trim();
  const correctAnswer = quiz.questions[quiz.currentIndex].english.trim();
  const vocab = quiz.questions[quiz.currentIndex];

  const formatText = text => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim();
  const isCorrect = formatText(userAnswer) === formatText(correctAnswer);

  quiz.isAnswered = true;
  inputEl.disabled = true;
  document.getElementById("btn-spelling-submit").disabled = true;

  recordAnswerResult(vocab, userAnswer, isCorrect);
  showFeedbackBanner(isCorrect, correctAnswer);
}

// Flashcard Mode
function setupFlashcardQuestion(question) {
  const card = document.getElementById("flashcard-3d");
  card.classList.remove("flipped");

  document.getElementById("flashcard-english").textContent = question.english;
  document.getElementById("flashcard-chinese").textContent = question.chinese;

  document.getElementById("flashcard-actions").classList.add("hidden");
}

function handleFlashcardRating(isCorrect) {
  const quiz = STATE.currentQuiz;
  const vocab = quiz.questions[quiz.currentIndex];

  recordAnswerResult(vocab, isCorrect ? "記住了" : "沒記住", isCorrect);
  loadNextQuestion();
}

// Multiple Choice Mode
function setupChoiceQuestion(question) {
  document.getElementById("choice-question-title").textContent = question.chinese;

  const container = document.getElementById("choice-options-container");
  container.innerHTML = "";

  let options = [question];

  // Distractors
  const distractorsPool = STATE.loadedVocabs.filter(v => v.id !== question.id);
  shuffleArray(distractorsPool);

  const selectedDistractors = distractorsPool.slice(0, 3);
  options = [...options, ...selectedDistractors];

  // If there are less than 4 vocabulary words, add default options
  while (options.length < 4) {
    options.push({
      id: `default-${Math.random()}`,
      english: "Default option " + (options.length + 1),
      chinese: "預設選項",
      wrongCount: 0,
      correctCount: 0
    });
  }

  shuffleArray(options);

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = opt.english;
    btn.addEventListener("click", () => handleChoiceAnswer(btn, opt.id === question.id, question.english));
    container.appendChild(btn);
  });
}

function handleChoiceAnswer(selectedBtn, isCorrect, correctAnswerText) {
  const quiz = STATE.currentQuiz;
  if (quiz.isAnswered) return;

  quiz.isAnswered = true;
  const vocab = quiz.questions[quiz.currentIndex];

  const container = document.getElementById("choice-options-container");
  const buttons = container.querySelectorAll(".choice-btn");

  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctAnswerText) {
      btn.classList.add("correct");
    }
  });

  if (!isCorrect) {
    selectedBtn.classList.add("incorrect");
  }

  recordAnswerResult(vocab, selectedBtn.textContent, isCorrect);
  showFeedbackBanner(isCorrect, correctAnswerText);
}

// Record Quiz Results
function recordAnswerResult(vocab, userAnswer, isCorrect) {
  const quiz = STATE.currentQuiz;

  quiz.results.push({
    vocab,
    userAnswer,
    isCorrect
  });

  if (isCorrect) {
    quiz.scoreCorrect++;
    document.getElementById("quiz-score-correct").textContent = quiz.scoreCorrect;
  } else {
    quiz.scoreWrong++;
    document.getElementById("quiz-score-wrong").textContent = quiz.scoreWrong;
    quiz.wrongsOnly.push(vocab);
  }
}

// Feedback Banners
function showFeedbackBanner(isCorrect, correctAnswer) {
  const banner = document.getElementById("quiz-feedback");
  const title = document.getElementById("feedback-title");
  const detail = document.getElementById("feedback-detail");
  const iconBox = banner.querySelector(".feedback-icon-box");

  banner.className = "quiz-feedback-banner " + (isCorrect ? "correct-banner" : "incorrect-banner");

  if (isCorrect) {
    title.textContent = "答對了！非常棒！";
    detail.textContent = `答案確為: "${correctAnswer}"`;
    iconBox.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  } else {
    title.textContent = "答錯了，再加把勁！";
    detail.textContent = `正確答案是: "${correctAnswer}"`;
    iconBox.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
  }

  banner.classList.remove("hidden");
}

function loadNextQuestion() {
  const quiz = STATE.currentQuiz;
  quiz.currentIndex++;

  if (quiz.currentIndex < quiz.count) {
    loadQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  const quiz = STATE.currentQuiz;
  quiz.active = false;

  document.getElementById("quiz-progress-fill").style.width = `100%`;

  // Display results panel
  document.getElementById("quiz-arena").classList.add("hidden");
  document.getElementById("quiz-results").classList.remove("hidden");

  const scoreText = `${quiz.scoreCorrect} / ${quiz.count}`;
  const percentText = `${quiz.count > 0 ? Math.round((quiz.scoreCorrect / quiz.count) * 100) : 0}%`;

  document.getElementById("result-score").textContent = scoreText;
  document.getElementById("result-percent").textContent = percentText;

  // Setup retry wrongs button
  document.getElementById("retry-count").textContent = quiz.wrongsOnly.length;
  const retryBtn = document.getElementById("btn-retry-wrongs");
  if (quiz.wrongsOnly.length === 0) {
    retryBtn.disabled = true;
    retryBtn.classList.add("hidden");
  } else {
    retryBtn.disabled = false;
    retryBtn.classList.remove("hidden");
  }

  // Populate Details Table
  const tableBody = document.getElementById("results-table-body");
  tableBody.innerHTML = "";

  quiz.results.forEach(res => {
    const tr = document.createElement("tr");

    const statusHTML = res.isCorrect
      ? `<span class="result-tag-correct"><i class="fa-solid fa-check"></i> 答對</span>`
      : `<span class="result-tag-wrong"><i class="fa-solid fa-xmark"></i> 答錯</span>`;

    tr.innerHTML = `
      <td><strong>${res.vocab.english}</strong></td>
      <td>${res.vocab.chinese}</td>
      <td>${res.userAnswer || '--'}</td>
      <td>${statusHTML}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function retryWrongQuestions() {
  const quiz = STATE.currentQuiz;
  const wrongs = [...quiz.wrongsOnly];

  if (wrongs.length === 0) return;

  shuffleArray(wrongs);

  STATE.currentQuiz = {
    active: true,
    mode: quiz.mode,
    count: wrongs.length,
    questions: wrongs,
    currentIndex: 0,
    scoreCorrect: 0,
    scoreWrong: 0,
    results: [],
    wrongsOnly: [],
    isAnswered: false,
    autoPlay: quiz.autoPlay
  };

  document.getElementById("quiz-results").classList.add("hidden");
  document.getElementById("quiz-arena").classList.remove("hidden");

  document.getElementById("quiz-total-questions").textContent = STATE.currentQuiz.count;
  document.getElementById("quiz-score-correct").textContent = "0";
  document.getElementById("quiz-score-wrong").textContent = "0";

  loadQuestion();
}
