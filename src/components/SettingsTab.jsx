import React, { useState, useEffect } from 'react';

export default function SettingsTab({ 
  settings, 
  availableVoices, 
  onSaveSettings, 
  onResetSettings,
  speak 
}) {
  const [voiceURI, setVoiceURI] = useState(settings.voiceURI || '');
  const [rate, setRate] = useState(settings.rate || 0.75);
  const [pitch, setPitch] = useState(settings.pitch || 1.0);
  const [speechMode, setSpeechMode] = useState(settings.speechMode || 'twice');
  const [testText, setTestText] = useState('Continuous learning builds intelligence. Welcome to EngFlow.');

  // Sync state with settings changes (e.g. on reset or load)
  useEffect(() => {
    setVoiceURI(settings.voiceURI);
    setRate(settings.rate);
    setPitch(settings.pitch);
    setSpeechMode(settings.speechMode);
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({ voiceURI, rate, pitch, speechMode });
  };

  const handleReset = () => {
    onResetSettings();
  };

  const handleTestSpeak = () => {
    speak(testText, null, false, { voiceURI, rate, pitch });
  };

  return (
    <section id="settings-tab" className="tab-panel active">
      <div className="card glass settings-container">
        <div className="card-header">
          <h2><i className="fa-solid fa-gears"></i> 系統語音設定</h2>
          <p>自訂語音合成引擎、發音口音、朗讀速度與音調</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Voice selection */}
          <div className="form-group">
            <label htmlFor="settings-voice"><i className="fa-solid fa-microphone"></i> 英文語音引擎 (TTS)</label>
            <select 
              id="settings-voice" 
              value={voiceURI} 
              onChange={(e) => setVoiceURI(e.target.value)}
              className="form-control"
            >
              {availableVoices.length === 0 ? (
                <option value="">無可用英文語音 (請確認裝置設定)</option>
              ) : (
                availableVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Speech Mode */}
          <div className="form-group">
            <label htmlFor="settings-speech-mode"><i className="fa-solid fa-repeat"></i> 單字發音重複模式</label>
            <select 
              id="settings-speech-mode" 
              value={speechMode} 
              onChange={(e) => setSpeechMode(e.target.value)}
              className="form-control"
            >
              <option value="twice">朗讀兩次 (正常速 + 慢速 0.5x)</option>
              <option value="once">只朗讀一次 (依設定語速)</option>
            </select>
          </div>

          {/* Rate slider */}
          <div className="form-group">
            <div className="slider-header">
              <label htmlFor="settings-rate"><i className="fa-solid fa-gauge-high"></i> 朗讀速度 (Rate)</label>
              <span className="slider-value" id="rate-value">{rate}x</span>
            </div>
            <div className="slider-container">
              <span className="slider-limit-label">慢 (0.5x)</span>
              <input 
                type="range" 
                id="settings-rate" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
              />
              <span className="slider-limit-label">快 (2.0x)</span>
            </div>
          </div>

          {/* Pitch slider */}
          <div className="form-group">
            <div className="slider-header">
              <label htmlFor="settings-pitch"><i className="fa-solid fa-wave-square"></i> 音調高低</label>
              <span className="slider-value" id="pitch-value">{pitch}</span>
            </div>
            <div className="slider-container">
              <span className="slider-limit-label">低沉 (0.5)</span>
              <input 
                type="range" 
                id="settings-pitch" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
              />
              <span className="slider-limit-label">高亢 (2.0)</span>
            </div>
          </div>

          {/* TTS Testing Section */}
          <div className="tts-test-box glass">
            <h3><i className="fa-solid fa-volume-high"></i> 語音效果測試</h3>
            <div className="test-input-group">
              <input 
                type="text" 
                id="tts-test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="請輸入欲測試的英文..."
              />
              <button 
                type="button" 
                id="btn-test-speak" 
                onClick={handleTestSpeak} 
                className="btn btn-primary"
              >
                <i className="fa-solid fa-play"></i> 播放測試
              </button>
            </div>
          </div>

          <div className="settings-actions">
            <button 
              type="button" 
              id="btn-reset-settings" 
              onClick={handleReset} 
              className="btn btn-secondary-outline"
            >
              <i className="fa-solid fa-rotate-left"></i> 重設為預設值
            </button>
            <button 
              type="submit" 
              id="btn-save-settings" 
              className="btn btn-primary"
            >
              <i className="fa-solid fa-floppy-disk"></i> 儲存設定
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
