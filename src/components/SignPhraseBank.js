import React, { useState } from "react";
import { FaSignLanguage, FaPrayingHands, FaRedo, FaQuestion, FaSun } from 'react-icons/fa';

export default function SignPhraseBank() {
  const phrases = [
    { text: "Hello", sign: <><FaSignLanguage /> Hello</> },
    { text: "Thank you", sign: <><FaPrayingHands /> Thank you</> },
    { text: "Please repeat", sign: <><FaRedo /> Please repeat</> },
    { text: "I don't understand", sign: <><FaQuestion /> I don't understand</> },
    { text: "Good morning", sign: <><FaSun /> Good morning</> },
  ];
  const [selected, setSelected] = useState(null);

  return (
    <section className="panel">
      <h2><FaSignLanguage /> Sign Language Phrase Bank</h2>
      <div className="phrases">
        {phrases.map((p, i) => (
          <button
            key={i}
            className={selected?.text === p.text ? "phrase selected" : "phrase"}
            onClick={() => setSelected(p)}
          >
            {p.text}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="sign-display">
          <p className="sign-text">{selected.text}</p>
          <p className="sign-symbol">{selected.sign}</p>
        </div>
      ) : (
        <p className="hint">Select a phrase to view its meaning.</p>
      )}
    </section>
  );
}