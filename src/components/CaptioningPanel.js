import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  FaGraduationCap,
  FaSave,
  FaMicrophone,
  FaStop,
  FaPlay,
  FaEraser,
  FaHeadphones,
  FaGlobe,
} from "react-icons/fa";
import "./CaptioningPanel.css";

export default function CaptioningPanel({ user, addToast }) {
  const [listening, setListening] = useState(false);

  // finalized text only
  const [caption, setCaption] = useState("");

  // live preview of current in-progress speech
  const [interimCaption, setInterimCaption] = useState("");

  const [translated, setTranslated] = useState("");
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);

  const [lang, setLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("tl");

  // Academic Session States
  const [subject, setSubject] = useState("");
  const [instructor, setInstructor] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [context, setContext] = useState("");

  // combined visible caption
  const fullCaption = `${caption} ${interimCaption}`.trim();

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

    rec.onstart = () => {
      setListening(true);
    };

    rec.onresult = (ev) => {
      let finalText = "";
      let interimText = "";

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const transcript = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        setCaption((prev) => `${prev} ${finalText}`.trim());
      }

      setInterimCaption(interimText.trim());
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // ignore harmless abort error when manually stopping
      if (event.error !== "aborted") {
        addToast?.(`Speech recognition error: ${event.error}`, "error");
      }
    };

    rec.onend = () => {
      setListening(false);

      // auto-restart if user intended to keep listening
      if (shouldBeListeningRef.current) {
        try {
          rec.start();
        } catch (err) {
          console.error("Speech recognition restart error:", err);
        }
      }
    };

    recognitionRef.current = rec;

    // if language changes while actively listening, restart recognizer
    if (shouldBeListeningRef.current) {
      try {
        rec.start();
      } catch (err) {
        console.error("Speech recognition start error after lang change:", err);
      }
    }

    return () => {
      shouldBeListeningRef.current = false;
      try {
        rec.stop();
      } catch (err) {
        console.error("Speech recognition cleanup error:", err);
      }
    };
  }, [lang, addToast]);

  const toggleListen = () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (shouldBeListeningRef.current) {
      shouldBeListeningRef.current = false;
      setInterimCaption("");
      try {
        rec.stop();
      } catch (err) {
        console.error("Speech recognition stop error:", err);
      }
    } else {
      // optional: clear on each new session
      setCaption("");
      setInterimCaption("");
      setTranslated("");

      shouldBeListeningRef.current = true;
      try {
        rec.start();
      } catch (err) {
        console.error("Speech recognition start error:", err);
        addToast?.("Unable to start microphone", "error");
      }
    }
  };

  useEffect(() => {
    if (!fullCaption.trim()) {
      setTranslated("");
      return;
    }

    const timer = setTimeout(async () => {
      if (targetLang === "taglish") {
        const taglishText = await convertToTaglish(fullCaption);
        setTranslated(taglishText);
      } else {
        const result = await translateText(fullCaption, targetLang);
        setTranslated(result);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [fullCaption, targetLang]);

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
        captions: fullCaption,
        translated,
        languageOutput: targetLang,
        createdAt: serverTimestamp(),
      });

      addToast?.("Academic session saved!", "success");

      setSubject("");
      setInstructor("");
      setSessionDate("");
      setContext("");
    } catch (err) {
      console.error("Save session error:", err);
      addToast?.("Failed to save session", "error");
    }
  };

  return (
    <section className="panel">
      <div className="academic-section">
        <div className="academic-header">
          <h2 className="academic-title">
            <FaGraduationCap /> Academic Session
          </h2>
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
            <FaSave /> Save Session
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: "25px" }}>
        <FaMicrophone /> Live Captions
      </h2>

      <div className="controls">
        <button
          className={listening ? "btn stop" : "btn start"}
          onClick={toggleListen}
        >
          {listening ? (
            <>
              <FaStop /> Stop Listening
            </>
          ) : (
            <>
              <FaPlay /> Start Listening
            </>
          )}
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
            setInterimCaption("");
            setTranslated("");
          }}
        >
          <FaEraser /> Clear
        </button>
      </div>

      <div className="caption-box scrollable">
        {fullCaption || (
          <>
            <FaHeadphones /> Speak now...
          </>
        )}
      </div>

      <div className="translated-box">
        {translated || (
          <>
            <FaGlobe /> Translation will appear here
          </>
        )}
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