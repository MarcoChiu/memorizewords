/* global __BUILD_TIME__ */
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import FilesTab from './components/FilesTab';
import QuizTab from './components/QuizTab';
import SettingsTab from './components/SettingsTab';
import { translatePhrasesBatch } from './utils/translation';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logOut, 
  isConfigured 
} from './utils/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs,
  query,
  orderBy,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

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
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
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

  // Firebase Auth states
  const [user, setUser] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(isConfigured);

  const loadLocalSettingsAndFiles = () => {
    const localSettings = localStorage.getItem("engflow_settings_v2");
    let loadedSettings = {
      voiceURI: '',
      rate: DEFAULTS.rate,
      pitch: DEFAULTS.pitch,
      speechMode: DEFAULTS.speechMode
    };
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        loadedSettings = { ...loadedSettings, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setSettings(loadedSettings);

    const activeTheme = loadedSettings.theme || DEFAULTS.theme;
    setTheme(activeTheme);
    document.body.className = activeTheme === 'light' ? 'light-mode' : 'dark-mode';
    
    setCategories([]);
    setActiveCategoryId('');
    setLoadedVocabs([]);
  };

  const syncUserDataFromFirestore = async (firebaseUser) => {
    if (!db) return;
    setIsLoading(true);
    try {
      // 1. Sync User metadata
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, {
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Sync Settings
      const settingsRef = doc(db, 'users', firebaseUser.uid, 'settings', 'preference');
      const settingsSnap = await getDoc(settingsRef);
      
      let activeSettings = { ...settings };
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        activeSettings = { ...activeSettings, ...data };
        setSettings(activeSettings);
        
        const activeTheme = activeSettings.theme || DEFAULTS.theme;
        setTheme(activeTheme);
        document.body.className = activeTheme === 'light' ? 'light-mode' : 'dark-mode';
        localStorage.setItem("engflow_settings_v2", JSON.stringify(activeSettings));
      } else {
        // First login, push current local settings to firestore
        await setDoc(settingsRef, {
          ...settings,
          theme: theme,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Load categories
      await fetchCategories(firebaseUser.uid);
      
    } catch (error) {
      console.error("Error syncing user data from Firestore:", error);
      showToast("同步雲端資料失敗");
      loadLocalSettingsAndFiles();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!isConfigured) {
      showToast("⚠️ 請先在根目錄建立並設定 .env 檔案以啟用 Firebase！");
      return;
    }
    try {
      await signInWithGoogle();
    } catch (e) {
      showToast("登入失敗，請稍後再試");
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      showToast("已成功登出");
    } catch (e) {
      showToast("登出失敗");
    }
  };

  // Load Title and Init TTS Voices on mount
  useEffect(() => {
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

        setSettings(prev => {
          if (!prev.voiceURI && voices.length > 0) {
            return { ...prev, voiceURI: voices[0].voiceURI };
          }
          return prev;
        });
      };

      loadVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Auth state listener

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2500);
  };

  const handleToggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.body.className = nextTheme === 'light' ? 'light-mode' : 'dark-mode';
    
    const newSettings = { ...settings, theme: nextTheme };
    setSettings(newSettings);
    localStorage.setItem("engflow_settings_v2", JSON.stringify(newSettings));
    showToast("主題已切換");

    if (user && db) {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preference');
        await setDoc(settingsRef, {
          theme: nextTheme,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Failed to sync theme to Firestore:", e);
      }
    }
  };

  // Auth state listener
  useEffect(() => {
    if (!isConfigured || !auth) {
      setIsFirebaseReady(false);
      loadLocalSettingsAndFiles();
      return;
    }
    setIsFirebaseReady(true);

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        showToast(`歡迎回來，${firebaseUser.displayName || '學習者'}！`);
        syncUserDataFromFirestore(firebaseUser);
      } else {
        setUser(null);
        loadLocalSettingsAndFiles();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchCategories = async (uid) => {
    const userId = uid || user?.uid;
    if (!userId || !db) return;
    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const q = query(categoriesRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCategories(list);
      
      if (list.length > 0) {
        const firstCatId = list[0].id;
        setActiveCategoryId(firstCatId);
        await fetchCategoryWords(firstCatId, userId);
      } else {
        setActiveCategoryId('');
        setLoadedVocabs([]);
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
      showToast("讀取分類失敗");
    }
  };

  const fetchCategoryWords = async (categoryId, uid) => {
    const userId = uid || user?.uid;
    if (!userId || !categoryId || !db) return;
    setIsLoading(true);
    try {
      const vocabsRef = collection(db, 'users', userId, 'categories', categoryId, 'vocabs');
      const q = query(vocabsRef, orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setLoadedVocabs(list);
    } catch (e) {
      console.error("Error fetching category words:", e);
      showToast("讀取單字失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (name) => {
    if (!user || !db || !name.trim()) return;
    try {
      const categoriesRef = collection(db, 'users', user.uid, 'categories');
      const newDoc = doc(categoriesRef);
      await setDoc(newDoc, {
        name: name.trim(),
        createdAt: new Date().toISOString()
      });
      showToast(`已新增分類 "${name}"`);
      
      const categoriesRef2 = collection(db, 'users', user.uid, 'categories');
      const q = query(categoriesRef2, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCategories(list);
      setActiveCategoryId(newDoc.id);
      setLoadedVocabs([]);
    } catch (e) {
      console.error("Error adding category:", e);
      showToast("新增分類失敗");
    }
  };

  const handleEditCategory = async (categoryId, newName) => {
    if (!user || !db || !categoryId || !newName.trim()) return;
    try {
      const catDocRef = doc(db, 'users', user.uid, 'categories', categoryId);
      await setDoc(catDocRef, {
        name: newName.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: newName.trim() } : c));
      showToast("分類已更名");
    } catch (e) {
      console.error("Error editing category:", e);
      showToast("修改分類失敗");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!user || !db || !categoryId) return;
    if (!window.confirm("確定要刪除此分類及其底下的所有單字嗎？")) return;
    
    setIsLoading(true);
    try {
      const vocabsRef = collection(db, 'users', user.uid, 'categories', categoryId, 'vocabs');
      const snap = await getDocs(vocabsRef);
      
      const batch = writeBatch(db);
      snap.forEach(d => {
        batch.delete(d.ref);
      });
      
      const catDocRef = doc(db, 'users', user.uid, 'categories', categoryId);
      batch.delete(catDocRef);
      
      await batch.commit();
      showToast("分類已刪除");
      
      const updatedCats = categories.filter(c => c.id !== categoryId);
      setCategories(updatedCats);
      if (activeCategoryId === categoryId) {
        if (updatedCats.length > 0) {
          setActiveCategoryId(updatedCats[0].id);
          await fetchCategoryWords(updatedCats[0].id);
        } else {
          setActiveCategoryId('');
          setLoadedVocabs([]);
        }
      }
    } catch (e) {
      console.error("Error deleting category:", e);
      showToast("刪除分類失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWord = async (english, chinese) => {
    if (!user || !db || !activeCategoryId || !english.trim()) {
      showToast("請先選擇一個單字分類！");
      return;
    }
    
    setIsTranslating(true);
    try {
      let chineseTranslation = chinese.trim();
      if (!chineseTranslation) {
        setTranslationProgress("0/1");
        const transDict = await translatePhrasesBatch([english]);
        chineseTranslation = transDict[english.trim().toLowerCase()] || "（未能取得翻譯）";
        setTranslationProgress("1/1");
      }
      
      const vocabsRef = collection(db, 'users', user.uid, 'categories', activeCategoryId, 'vocabs');
      const newDoc = doc(vocabsRef);
      const wordData = {
        english: english.trim(),
        chinese: chineseTranslation,
        wrongCount: 0,
        correctCount: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(newDoc, wordData);
      
      setLoadedVocabs(prev => [...prev, { id: newDoc.id, ...wordData }]);
      showToast(`已新增單字 "${english}"`);
    } catch (e) {
      console.error("Error adding word:", e);
      showToast("新增單字失敗");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleEditWord = async (vocabId, english, chinese) => {
    if (!user || !db || !activeCategoryId || !vocabId || !english.trim()) return;
    try {
      const vocabRef = doc(db, 'users', user.uid, 'categories', activeCategoryId, 'vocabs', vocabId);
      const updatedData = {
        english: english.trim(),
        chinese: chinese.trim(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(vocabRef, updatedData, { merge: true });
      
      setLoadedVocabs(prev => prev.map(v => v.id === vocabId ? { ...v, ...updatedData } : v));
      showToast("單字已修改");
    } catch (e) {
      console.error("Error editing word:", e);
      showToast("修改單字失敗");
    }
  };

  const handleDeleteWord = async (vocabId) => {
    if (!user || !db || !activeCategoryId || !vocabId) return;
    try {
      const vocabRef = doc(db, 'users', user.uid, 'categories', activeCategoryId, 'vocabs', vocabId);
      await deleteDoc(vocabRef);
      
      setLoadedVocabs(prev => prev.filter(v => v.id !== vocabId));
      showToast("單字已刪除");
    } catch (e) {
      console.error("Error deleting word:", e);
      showToast("刪除單字失敗");
    }
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

  const handleAssembleAllCategoriesVocabs = async () => {
    if (!user || !db) return [];
    try {
      const allVocabs = [];
      const categoriesRef = collection(db, 'users', user.uid, 'categories');
      const catsSnap = await getDocs(categoriesRef);
      
      const promises = [];
      catsSnap.forEach(catDoc => {
        const catId = catDoc.id;
        const vocabsRef = collection(db, 'users', user.uid, 'categories', catId, 'vocabs');
        promises.push(getDocs(vocabsRef).then(snap => {
          const catVocabs = [];
          snap.forEach(d => {
            catVocabs.push({
              id: d.id,
              categoryId: catId,
              ...d.data()
            });
          });
          return catVocabs;
        }));
      });
      
      const results = await Promise.all(promises);
      results.forEach(res => {
        allVocabs.push(...res);
      });

      const seenEnglish = new Set();
      const pool = [];
      allVocabs.forEach((item, idx) => {
        const engKey = item.english.trim();
        if (seenEnglish.has(engKey.toLowerCase())) return;
        seenEnglish.add(engKey.toLowerCase());
        
        pool.push({
          id: item.id,
          english: item.english,
          chinese: item.chinese,
          wrongCount: item.wrongCount || 0,
          correctCount: item.correctCount || 0
        });
      });
      
      return pool;
    } catch (e) {
      console.error("Error assembling all vocabs:", e);
      return [];
    }
  };

  const handleSaveSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("engflow_settings_v2", JSON.stringify(updated));
    showToast("設定已儲存");

    if (user && db) {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preference');
        await setDoc(settingsRef, {
          ...updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Failed to sync settings to Firestore:", e);
      }
    }
  };

  const handleResetSettings = async () => {
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

    if (user && db) {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preference');
        await setDoc(settingsRef, reset);
      } catch (e) {
        console.error("Failed to sync reset settings to Firestore:", e);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Background decoration */}
      <div className="background-decor">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>

      <Header 
        theme={theme} 
        onToggleTheme={handleToggleTheme} 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isFirebaseReady={isFirebaseReady}
      />
      
      <Navigation activeTab={activeTab} onSwitchTab={setActiveTab} />

      <main className="app-main">
        {activeTab === 'files-tab' && (
          <FilesTab
            categories={categories}
            activeCategoryId={activeCategoryId}
            loadedVocabs={loadedVocabs}
            isLoading={isLoading}
            translationProgress={translationProgress}
            isTranslating={isTranslating}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onSelectCategory={(id) => {
              setActiveCategoryId(id);
              fetchCategoryWords(id);
            }}
            onAddWord={handleAddWord}
            onEditWord={handleEditWord}
            onDeleteWord={handleDeleteWord}
            speak={speak}
            showToast={showToast}
            user={user}
            onLogin={handleLogin}
          />
        )}

        {activeTab === 'quiz-tab' && (
          <QuizTab
            loadedVocabs={loadedVocabs}
            categories={categories}
            speak={speak}
            showToast={showToast}
            onAssembleAllCategoriesVocabs={handleAssembleAllCategoriesVocabs}
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
