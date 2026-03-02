import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import "./CaptioningPanel.css";

export default function CaptioningPanel({ user, addToast }) {
  const [listening, setListening] = useState(false);
  const [caption, setCaption] = useState("");
  const [translated, setTranslated] = useState("");
  const recognitionRef = useRef(null);
  const [lang, setLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("tl");

  // Academic Session States
  const [subject, setSubject] = useState("");
  const [instructor, setInstructor] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [context, setContext] = useState("");

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

    const timer = setTimeout(async () => {
      if (targetLang === "taglish") {
        const taglishText = await convertToTaglish(caption);
        setTranslated(taglishText);
      } else {
        const result = await translateText(caption, targetLang);
        setTranslated(result);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [caption, targetLang]);

  const saveSession = async () => {
    if (!subject || !instructor || !sessionDate) {
      alert("Please fill in Subject, Instructor, and Date.");
      return;
    }

    try {
      await addDoc(collection(db, "academicSessions"), {
        userId: user?.uid || null,
        subject,
        instructor,
        sessionDate,
        context,
        captions: caption,
        translated,
        languageOutput: targetLang,
        createdAt: serverTimestamp(),
      });

      addToast && addToast("Academic session saved!", "success");

      setSubject("");
      setInstructor("");
      setSessionDate("");
      setContext("");
    } catch (err) {
      console.error("Save session error:", err);
      addToast && addToast("Failed to save session", "error");
    }
  };

  return (
    <section className="panel">
      {/* ✅ Redesigned Academic Session UI (logic unchanged) */}
      <div className="academic-section">
        <div className="academic-header">
          <h2 className="academic-title">🎓 Academic Session</h2>
          <span className="academic-badge">Session Info</span>
        </div>

        <div className="academic-form">
          <div className="academic-field">
            <label>Subject</label>
            <input
              placeholder="e.g. Mathematics 101"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="academic-field">
            <label>Instructor</label>
            <input
              placeholder="e.g. Prof. Dela Cruz"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>

          <div className="academic-field">
            <label>Date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <div className="academic-field">
            <label>Context</label>
            <input
              placeholder="Lecture, Lab, Seminar..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>

        <div className="academic-actions">
          <button className="btn start academic-btn" onClick={saveSession}>
            💾 Save Session
          </button>
        </div>
      </div>

      {/* Live Captions Section (unchanged design/behavior) */}
      <h2 style={{ marginTop: "25px" }}>🎤 Live Captions</h2>

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
          <option value="taglish">Taglish</option>
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

      <div className="caption-box scrollable">{caption || "🎧 Speak now..."}</div>

      <div className="translated-box">
        {translated || "🌐 Translation will appear here"}
      </div>
    </section>
  );
}

async function translateText(q, targetLang) {
  const langMap = {
    en: "en",
    tl: "tl",
    es: "es",
  };

  const target = langMap[targetLang] || "en";
  const url = `https://lingva.ml/api/v1/auto/${target}/${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.translation || "";
  } catch (err) {
    console.error("Lingva translate error:", err);
    return "";
  }
}

async function convertToTaglish(text) {
  const filipino = await translateText(text, "tl");
  return filipino
    .replace(/\bpero\b/gi, "pero still")
    .replace(/\bdahil\b/gi, "because")
    .replace(/\bkapag\b/gi, "kapag")
    .replace(/\bat\b/gi, "at saka");
}