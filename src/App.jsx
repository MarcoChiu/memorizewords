/* global __BUILD_TIME__ */
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import FilesTab from './components/FilesTab';
import QuizTab from './components/QuizTab';
import SettingsTab from './components/SettingsTab';
import { translatePhrasesBatch } from './utils/translation';

const DEFAULTS = {
  rate: 0.75,
  pitch: 1.0,
  theme: 'dark',
  speechMode: 'twice'
};

export default function App() {
  // App States
  const [theme, setTheme] = useState(DEFAULTS.theme);
  const [activeTab, setActiveTab] = useState('files-tab');
  const [files, setFiles] = useState([]);
  const [localFiles, setLocalFiles] = useState({});
  const [activeFileName, setActiveFileName] = useState('');
  const [loadedVocabs, setLoadedVocabs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('0/0');
  
  // TTS Settings
  const [settings, setSettings] = useState({
    voiceURI: '',
    rate: DEFAULTS.rate,
    pitch: DEFAULTS.pitch,
    speechMode: DEFAULTS.speechMode
  });
  const [availableVoices, setAvailableVoices] = useState([]);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '' });
  const toastTimeoutRef = useRef(null);
  
  // TTS Ref
  const currentSpeechSequenceId = useRef(0);

  // Load Settings and Voices on mount
  useEffect(() => {
    // Load Settings
    const localSettings = localStorage.getItem("engflow_settings_v2");
    let loadedSettings = { ...settings };
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        loadedSettings = { ...loadedSettings, ...parsed };
        setSettings(loadedSettings);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    // Load theme
    const activeTheme = loadedSettings.theme || DEFAULTS.theme;
    setTheme(activeTheme);
    document.body.className = activeTheme === 'light' ? 'light-mode' : 'dark-mode';
    document.title = `每日英文學習 & 智慧抽考系統 (${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Dev'} build)`;

    // Init TTS Voices
    const synth = window.speechSynthesis;
    if (synth) {
      const loadVoices = () => {
        let voices = synth.getVoices().filter(voice => voice.lang.toLowerCase().includes('en'));
        voices.sort((a, b) => {
          const aLocal = a.localService === true;
          const bLocal = b.localService === true;
          if (aLocal && !bLocal) return -1;
          if (!aLocal && bLocal) return 1;
          return 0;
        });
        setAvailableVoices(voices);

        // Set default voice if none was selected
        if (!loadedSettings.voiceURI && voices.length > 0) {
          setSettings(prev => ({ ...prev, voiceURI: voices[0].voiceURI }));
        }
      };

      loadVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Fetch initial files
  useEffect(() => {
    refreshFileList();
  }, [localFiles]);

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2500);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.body.className = nextTheme === 'light' ? 'light-mode' : 'dark-mode';
    
    const newSettings = { ...settings, theme: nextTheme };
    setSettings(newSettings);
    localStorage.setItem("engflow_settings_v2", JSON.stringify(newSettings));
    showToast("主題已切換");
  };

  const refreshFileList = async () => {
    setIsLoading(true);
    let serverFiles = [];
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        serverFiles = await response.json();
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Failed to load files from API server, falling back to static files.json");
      try {
        const response = await fetch('data/files.json');
        if (response.ok) {
          serverFiles = await response.json();
        }
      } catch (staticErr) {
        console.error("Static files.json fetch failed:", staticErr);
      }
    }

    const localNames = Object.keys(localFiles);
    const allFiles = [...localNames];
    serverFiles.forEach(file => {
      if (!allFiles.includes(file)) {
        allFiles.push(file);
      }
    });

    setFiles(allFiles);
    setIsLoading(false);

    // Auto-load first file
    if (!activeFileName && allFiles.length > 0) {
      loadFile(allFiles[0], allFiles, localFiles);
    }
  };

  const loadFile = async (fileName, currentFiles = files, currentLocalFiles = localFiles) => {
    setActiveFileName(fileName);
    setIsTranslating(true);
    setTranslationProgress('0/0');
    setLoadedVocabs([]);

    try {
      let text = '';
      if (currentLocalFiles[fileName] !== undefined) {
        text = currentLocalFiles[fileName];
      } else {
        let response;
        try {
          response = await fetch(`data/${encodeURIComponent(fileName)}`);
          if (!response.ok) throw new Error();
        } catch {
          response = await fetch(`/api/file?name=${encodeURIComponent(fileName)}`);
          if (!response.ok) throw new Error("File not found");
        }
        text = await response.text();
      }

      const lines = text.split(/\r?\n/);
      const phrasesToTranslate = [];
      const parsedItems = [];

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
          phrasesToTranslate.push(english);
        }

        if (english) {
          parsedItems.push({
            id: `vocab-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            english,
            chinese,
            wrongCount: 0,
            correctCount: 0
          });
        }
      });

      if (parsedItems.length === 0) {
        setIsTranslating(false);
        showToast("此檔案無有效單字。");
        return;
      }

      setTranslationProgress(`0/${phrasesToTranslate.length}`);
      const translationDictionary = await translatePhrasesBatch(phrasesToTranslate, (curr, total) => {
        setTranslationProgress(`${curr}/${total}`);
      });

      parsedItems.forEach(item => {
        if (!item.chinese) {
          const key = item.english.trim().toLowerCase();
          item.chinese = translationDictionary[key] || "（未能取得翻譯）";
        }
      });

      setLoadedVocabs(parsedItems);
      setIsTranslating(false);
      showToast(`成功載入 ${fileName}`);
    } catch (error) {
      console.error(error);
      setIsTranslating(false);
      showToast("載入檔案失敗！");
    }
  };

  const handleUploadLocalFiles = (uploadedFiles) => {
    let loadedCount = 0;
    const targetCount = uploadedFiles.length;
    let lastLoadedName = '';
    const newLocalFiles = { ...localFiles };

    Array.from(uploadedFiles).forEach(file => {
      if (!file.name.endsWith('.txt')) {
        showToast(`不支援的檔案格式: ${file.name} (僅支援 .txt)`);
        loadedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        newLocalFiles[file.name] = content;
        lastLoadedName = file.name;
        loadedCount++;

        if (loadedCount === targetCount) {
          setLocalFiles(newLocalFiles);
          showToast(`已成功匯入 ${targetCount} 個本機檔案`);
          if (lastLoadedName) {
            // Re-fetch files with updated localFiles
            const updatedNames = Object.keys(newLocalFiles);
            const combined = [...updatedNames];
            files.forEach(f => {
              if (!combined.includes(f)) combined.push(f);
            });
            setFiles(combined);
            loadFile(lastLoadedName, combined, newLocalFiles);
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    });
  };

  const speak = (text, callback = null, isAutoplay = false, customParams = null) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      showToast("您的瀏覽器不支援語音合成！");
      if (callback) callback();
      return;
    }

    synth.cancel();

    if (!text) {
      if (callback) callback();
      return;
    }

    const seqId = ++currentSpeechSequenceId.current;

    const rateParam = customParams ? customParams.rate : settings.rate;
    const pitchParam = customParams ? customParams.pitch : settings.pitch;
    const voiceURIParam = customParams ? customParams.voiceURI : settings.voiceURI;
    const speechModeParam = customParams ? customParams.speechMode : settings.speechMode;

    const createUtterance = (speechText, speed, onSpeechEnd, onSpeechError) => {
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'en-US';

      let voice = availableVoices.find(v => v.voiceURI === voiceURIParam);
      if (!voice && availableVoices.length > 0) {
        voice = availableVoices[0];
      }
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = speed;
      utterance.pitch = pitchParam;
      utterance.onend = onSpeechEnd;
      utterance.onerror = onSpeechError;

      return utterance;
    };

    setTimeout(() => {
      if (currentSpeechSequenceId.current !== seqId) return;

      const utterance1 = createUtterance(
        text,
        rateParam,
        () => {
          if (speechModeParam === 'once') {
            if (callback) callback();
            return;
          }

          // Slow pronunciation secondary check
          setTimeout(() => {
            if (currentSpeechSequenceId.current !== seqId) return;
            const slowRate = Math.max(0.1, rateParam - 0.25);
            const utterance2 = createUtterance(
              text,
              slowRate,
              () => {
                if (callback) callback();
              },
              (e) => {
                console.error("Slow speech error:", e);
                if (callback) callback();
              }
            );
            synth.speak(utterance2);
          }, 1500);
        },
        (e) => {
          console.error("Speech synthesis error:", e);
          if (callback) callback();
        }
      );

      synth.speak(utterance1);
    }, 50);
  };

  const handleAssembleAllFilesVocabs = async () => {
    let combinedItems = [];
    const phrasesToTranslate = [];

    const fetchPromises = files.map(async (file) => {
      try {
        let text = '';
        if (localFiles[file] !== undefined) {
          text = localFiles[file];
        } else {
          let response;
          try {
            response = await fetch(`data/${encodeURIComponent(file)}`);
            if (!response.ok) throw new Error();
          } catch {
            response = await fetch(`/api/file?name=${encodeURIComponent(file)}`);
            if (!response.ok) return [];
          }
          text = await response.text();
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
            fileItems.push({ english, chinese, index });
          }
        });
        return fileItems;
      } catch (err) {
        console.error("Error reading file:", file, err);
        return [];
      }
    });

    const allFilesResults = await Promise.all(fetchPromises);
    allFilesResults.forEach((fileItems) => {
      fileItems.forEach(item => {
        combinedItems.push(item);
        if (!item.chinese && !phrasesToTranslate.includes(item.english)) {
          phrasesToTranslate.push(item.english);
        }
      });
    });

    if (combinedItems.length === 0) return [];

    let translationDictionary = {};
    if (phrasesToTranslate.length > 0) {
      showToast(`正在透過 Google 翻譯 ${phrasesToTranslate.length} 個歷史單字...`);
      translationDictionary = await translatePhrasesBatch(phrasesToTranslate);
    }

    const seenEnglish = new Set();
    const pool = [];
    combinedItems.forEach((item, idx) => {
      const engKey = item.english.trim();
      if (seenEnglish.has(engKey)) return;
      seenEnglish.add(engKey);

      let finalChinese = item.chinese;
      if (!finalChinese) {
        finalChinese = translationDictionary[engKey.toLowerCase()] || "（未能取得翻譯）";
      }

      pool.push({
        id: `vocab-mix-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        english: item.english,
        chinese: finalChinese,
        wrongCount: 0,
        correctCount: 0
      });
    });

    return pool;
  };

  const handleSaveSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("engflow_settings_v2", JSON.stringify(updated));
    showToast("設定已儲存");
  };

  const handleResetSettings = () => {
    const defaultVoice = availableVoices.length > 0 ? availableVoices[0].voiceURI : '';
    const reset = {
      voiceURI: defaultVoice,
      rate: DEFAULTS.rate,
      pitch: DEFAULTS.pitch,
      speechMode: DEFAULTS.speechMode
    };
    setSettings(reset);
    localStorage.setItem("engflow_settings_v2", JSON.stringify(reset));
    showToast("已重設為預設值");
  };

  return (
    <div className="app-container">
      {/* Background decoration */}
      <div className="background-decor">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>

      <Header theme={theme} onToggleTheme={handleToggleTheme} />
      
      <Navigation activeTab={activeTab} onSwitchTab={setActiveTab} />

      <main className="app-main">
        {activeTab === 'files-tab' && (
          <FilesTab
            files={files}
            activeFileName={activeFileName}
            localFiles={localFiles}
            loadedVocabs={loadedVocabs}
            isLoading={isLoading}
            translationProgress={translationProgress}
            isTranslating={isTranslating}
            onRefreshFiles={refreshFileList}
            onLoadFile={(file) => loadFile(file)}
            onUploadLocalFiles={handleUploadLocalFiles}
            speak={speak}
            showToast={showToast}
          />
        )}

        {activeTab === 'quiz-tab' && (
          <QuizTab
            loadedVocabs={loadedVocabs}
            files={files}
            speak={speak}
            showToast={showToast}
            onAssembleAllFilesVocabs={handleAssembleAllFilesVocabs}
          />
        )}

        {activeTab === 'settings-tab' && (
          <SettingsTab
            settings={settings}
            availableVoices={availableVoices}
            onSaveSettings={handleSaveSettings}
            onResetSettings={handleResetSettings}
            speak={speak}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 EngFlow. React 元件化版本，支援單字翻譯、語音跟讀與智慧拼字測驗。</p>
      </footer>

      {/* Notification Toast */}
      <div id="toast" className={`toast ${toast.show ? '' : 'hidden'}`}>
        <i className="fa-solid fa-circle-info toast-icon"></i>
        <span id="toast-message">{toast.message}</span>
      </div>
    </div>
  );
}
