import React, { useState, useRef, useEffect } from "react";

export default function CaptioningPanel() {
  const [listening, setListening] = useState(false);
  const [caption, setCaption] = useState("");
  const [translated, setTranslated] = useState("");
  const recognitionRef = useRef(null);
  const [lang, setLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("tl");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API not supported in this browser.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (ev) => {
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const res = ev.results[i];
        if (res.isFinal) final += res[0].transcript;
      }
      if (final) setCaption((prev) => prev + " " + final);
    };
    recognitionRef.current = rec;
    return () => rec.stop();
  }, [lang]);

  const toggleListen = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setCaption("");
      setTranslated("");
      rec.start();
      setListening(true);
    }
  };

  useEffect(() => {
    if (!caption.trim()) return setTranslated("");
    const timer = setTimeout(() => {
      translateText(caption, targetLang).then(setTranslated);
    }, 700);
    return () => clearTimeout(timer);
  }, [caption, targetLang]);

  return (
    <section className="panel">
      <h2>🎤 Live Captions</h2>
      <div className="controls">
        <button
          className={listening ? "btn stop" : "btn start"}
          onClick={toggleListen}
        >
          {listening ? "⏹ Stop Listening" : "▶ Start Listening"}
        </button>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en-US">English (US)</option>
          <option value="fil-PH">Filipino</option>
          <option value="es-ES">Spanish</option>
        </select>
        <label>→ Translate to:</label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          <option value="en">English</option>
          <option value="tl">Filipino</option>
          <option value="es">Spanish</option>
        </select>
        <button
          className="btn clear"
          onClick={() => {
            setCaption("");
            setTranslated("");
          }}
        >
          🧹 Clear
        </button>
      </div>

      <div className="caption-box scrollable">
        {caption || "🎧 Speak now..."}
      </div>
      <div className="translated-box">
        {translated || "🌐 Translation will appear here"}
      </div>
    </section>
  );
}

async function translateText(q, targetLang) {
  // Map your language codes to Lingva's expected codes
  const langMap = {
    en: "en",
    tl: "tl", // Filipino
    es: "es",
    "fil": "tl",
    "fil-PH": "tl",
    "en-US": "en",
    "es-ES": "es"
  };
  
  // Detect source language from your lang state, fallback to 'auto'
  const sourceLang = langMap[window?.lang] || "auto";
  const target = langMap[targetLang] || "en";
  const url = `https://lingva.ml/api/v1/${sourceLang}/${target}/${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.translation || "";
  } catch (err) {
    console.error("Lingva translate error:", err);
    return "";
  }
}