import React, { useState, useRef } from "react";

export default function Recorder() {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hearme_${Date.now()}.webm`;
        a.click();
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    recorder?.stop();
    setRecording(false);
  };

  return (
    <section className="panel">
      <h2>🎙️ Meeting Recorder</h2>
      <button
        className={recording ? "btn stop" : "btn start"}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "⏹ Stop & Download" : "⏺ Start Recording"}
      </button>
      <p className="hint">
        Audio files will download automatically after recording.
      </p>
    </section>
  );
}