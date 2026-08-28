import React, {
  useState,
  useRef,
  useEffect,
} from "react";

import { db } from "../firebase";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  FaGraduationCap,
  FaSave,
  FaMicrophone,
  FaStop,
  FaPlay,
  FaEraser,
  FaHeadphones,
  FaGlobe,
  FaSignLanguage,
  FaPlayCircle,
  FaFlask,
} from "react-icons/fa";

import { fslPhrases } from "./fslPhrases";

import "./CaptioningPanel.css";

export default function CaptioningPanel({
  user,
  addToast,
}) {
  const [listening, setListening] =
    useState(false);

  const [caption, setCaption] =
    useState("");

  const [
    interimCaption,
    setInterimCaption,
  ] = useState("");

  const [translated, setTranslated] =
    useState("");

  const [
    translationStatus,
    setTranslationStatus,
  ] = useState("");

  const [
    detectedFslPhrase,
    setDetectedFslPhrase,
  ] = useState(null);

  const recognitionRef =
    useRef(null);

  const shouldBeListeningRef =
    useRef(false);

  const lastMatchKeyRef =
    useRef(null);

  const fslClearTimerRef =
    useRef(null);

  const translationRequestRef =
    useRef(0);

  const [inputMode, setInputMode] =
    useState("en-US");

  const [targetLang, setTargetLang] =
    useState("tl");

  const [subject, setSubject] =
    useState("");

  const [instructor, setInstructor] =
    useState("");

  const [sessionDate, setSessionDate] =
    useState("");

  const [context, setContext] =
    useState("");

  const fullCaption =
    `${caption} ${interimCaption}`.trim();

  const speechRecognitionLanguage =
    getSpeechRecognitionLanguage(
      inputMode
    );

  /*
    SPEECH RECOGNITION
  */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Web Speech API is not supported in this browser."
      );

      return;
    }

    const rec =
      new SpeechRecognition();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      speechRecognitionLanguage;

    rec.onstart = () => {
      setListening(true);
    };

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0].transcript;

        if (
          event.results[i].isFinal
        ) {
          finalText +=
            transcript + " ";
        } else {
          interimText +=
            transcript;
        }
      }

      if (finalText) {
        setCaption(
          (previous) =>
            `${previous} ${finalText}`.trim()
        );
      }

      setInterimCaption(
        interimText.trim()
      );
    };

    rec.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error !== "aborted" &&
        event.error !== "no-speech"
      ) {
        addToast?.(
          `Speech recognition error: ${event.error}`,
          "error"
        );
      }
    };

    rec.onend = () => {
      setListening(false);

      if (
        shouldBeListeningRef.current
      ) {
        try {
          rec.start();
        } catch (error) {
          console.error(
            "Speech recognition restart error:",
            error
          );
        }
      }
    };

    recognitionRef.current =
      rec;

    return () => {
      shouldBeListeningRef.current =
        false;

      try {
        rec.stop();
      } catch (error) {
        console.error(
          "Speech recognition cleanup error:",
          error
        );
      }
    };
  }, [
    speechRecognitionLanguage,
    addToast,
  ]);

  /*
    FSL MATCHING
  */
  useEffect(() => {
    if (!fullCaption.trim()) {
      return;
    }

    const match =
      findLatestFslMatch(
        fullCaption
      );

    if (!match) {
      return;
    }

    const matchKey =
      `${match.phrase.id}-${match.index}`;

    if (
      lastMatchKeyRef.current ===
      matchKey
    ) {
      return;
    }

    lastMatchKeyRef.current =
      matchKey;

    setDetectedFslPhrase(
      match.phrase
    );

    if (
      fslClearTimerRef.current
    ) {
      clearTimeout(
        fslClearTimerRef.current
      );
    }

    fslClearTimerRef.current =
      setTimeout(() => {
        setDetectedFslPhrase(
          null
        );
      }, 6000);
  }, [fullCaption]);

  useEffect(() => {
    return () => {
      if (
        fslClearTimerRef.current
      ) {
        clearTimeout(
          fslClearTimerRef.current
        );
      }
    };
  }, []);

  /*
    TRANSLATION
  */
  useEffect(() => {
    if (!fullCaption.trim()) {
      setTranslated("");
      setTranslationStatus("");
      return;
    }

    const requestId =
      ++translationRequestRef.current;

    const timer =
      setTimeout(async () => {
        setTranslationStatus(
          "Translating..."
        );

        try {
          let result = "";

          if (
            inputMode === "taglish"
          ) {
            result =
              await translateTaglish(
                fullCaption,
                targetLang
              );
          } else if (
            targetLang ===
            "taglish"
          ) {
            result =
              await convertToTaglish(
                fullCaption,
                inputMode
              );
          } else {
            result =
              await translateText(
                fullCaption,
                inputMode,
                targetLang
              );
          }

          if (
            requestId !==
            translationRequestRef.current
          ) {
            return;
          }

          if (result) {
            setTranslated(result);
            setTranslationStatus("");
          } else {
            setTranslated("");

            setTranslationStatus(
              "Translation temporarily unavailable."
            );
          }
        } catch (error) {
          console.error(
            "Translation error:",
            error
          );

          if (
            requestId !==
            translationRequestRef.current
          ) {
            return;
          }

          setTranslated("");

          setTranslationStatus(
            "Translation temporarily unavailable."
          );
        }
      }, 1200);

    return () =>
      clearTimeout(timer);
  }, [
    fullCaption,
    targetLang,
    inputMode,
  ]);

  const toggleListen = () => {
    const rec =
      recognitionRef.current;

    if (!rec) return;

    if (
      shouldBeListeningRef.current
    ) {
      shouldBeListeningRef.current =
        false;

      setInterimCaption("");

      try {
        rec.stop();
      } catch (error) {
        console.error(
          "Speech recognition stop error:",
          error
        );
      }
    } else {
      setCaption("");
      setInterimCaption("");
      setTranslated("");
      setTranslationStatus("");

      setDetectedFslPhrase(
        null
      );

      lastMatchKeyRef.current =
        null;

      if (
        fslClearTimerRef.current
      ) {
        clearTimeout(
          fslClearTimerRef.current
        );
      }

      shouldBeListeningRef.current =
        true;

      try {
        rec.start();
      } catch (error) {
        console.error(
          "Speech recognition start error:",
          error
        );

        addToast?.(
          "Unable to start microphone",
          "error"
        );
      }
    }
  };

  const clearCaption = () => {
    setCaption("");
    setInterimCaption("");
    setTranslated("");
    setTranslationStatus("");

    setDetectedFslPhrase(
      null
    );

    lastMatchKeyRef.current =
      null;

    translationRequestRef.current++;

    if (
      fslClearTimerRef.current
    ) {
      clearTimeout(
        fslClearTimerRef.current
      );
    }
  };

  const handleInputModeChange =
    (event) => {
      const newMode =
        event.target.value;

      if (
        shouldBeListeningRef.current
      ) {
        shouldBeListeningRef.current =
          false;

        try {
          recognitionRef.current?.stop();
        } catch (error) {
          console.error(
            "Speech recognition stop error:",
            error
          );
        }
      }

      setInputMode(newMode);

      setCaption("");
      setInterimCaption("");
      setTranslated("");
      setTranslationStatus("");
    };

  const saveSession =
    async () => {
      if (
        !subject ||
        !instructor ||
        !sessionDate
      ) {
        alert(
          "Please fill in Subject, Instructor, and Date."
        );

        return;
      }

      try {
        await addDoc(
          collection(
            db,
            "academicSessions"
          ),
          {
            userId:
              user?.uid || null,

            subject,
            instructor,
            sessionDate,
            context,

            captions:
              fullCaption,

            translated,

            inputMode,

            languageOutput:
              targetLang,

            createdAt:
              serverTimestamp(),
          }
        );

        addToast?.(
          "Academic session saved!",
          "success"
        );

        setSubject("");
        setInstructor("");
        setSessionDate("");
        setContext("");
      } catch (error) {
        console.error(
          "Save session error:",
          error
        );

        addToast?.(
          "Failed to save session",
          "error"
        );
      }
    };

  const experimentalMode =
    inputMode === "taglish" ||
    targetLang === "taglish";

  return (
    <section className="panel">

      <div className="academic-section">

        <div className="academic-header">

          <h2 className="academic-title">
            <FaGraduationCap />
            Academic Session
          </h2>

          <span className="academic-badge">
            Session Info
          </span>

        </div>

        <div className="academic-form">

          <div className="academic-field">
            <label>
              Subject
            </label>

            <input
              placeholder="e.g. Mathematics 101"
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value
                )
              }
            />
          </div>

          <div className="academic-field">
            <label>
              Instructor
            </label>

            <input
              placeholder="e.g. Prof. Dela Cruz"
              value={instructor}
              onChange={(event) =>
                setInstructor(
                  event.target.value
                )
              }
            />
          </div>

          <div className="academic-field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={sessionDate}
              onChange={(event) =>
                setSessionDate(
                  event.target.value
                )
              }
            />
          </div>

          <div className="academic-field">
            <label>
              Context
            </label>

            <input
              placeholder="Lecture, Lab, Seminar..."
              value={context}
              onChange={(event) =>
                setContext(
                  event.target.value
                )
              }
            />
          </div>

        </div>

        <div className="academic-actions">

          <button
            className="btn start academic-btn"
            onClick={saveSession}
          >
            <FaSave />
            Save Session
          </button>

        </div>
      </div>

      <h2
        style={{
          marginTop: "25px",
        }}
      >
        <FaMicrophone />
        Live Captions
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            flex: "1 1 220px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "6px",
              opacity: "0.75",
            }}
          >
            Speech / Input
          </label>

          <select
            value={inputMode}
            onChange={
              handleInputModeChange
            }
            style={{
              width: "100%",
            }}
          >
            <option value="en-US">
              English (US)
            </option>

            <option value="fil-PH">
              Filipino
            </option>

            <option value="taglish">
              Taglish — Experimental
            </option>
          </select>
        </div>

        <div
          style={{
            flex: "1 1 220px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "6px",
              opacity: "0.75",
            }}
          >
            Translate To
          </label>

          <select
            value={targetLang}
            onChange={(event) =>
              setTargetLang(
                event.target.value
              )
            }
            style={{
              width: "100%",
            }}
          >
            <option value="en">
              English
            </option>

            <option value="tl">
              Filipino
            </option>

            <option value="es">
              Spanish
            </option>

            <option value="taglish">
              Taglish — Experimental
            </option>
          </select>
        </div>
      </div>

      {experimentalMode && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "9px",
            padding: "11px 13px",
            marginBottom: "14px",
            borderRadius: "10px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            background:
              "rgba(255,255,255,0.04)",
            fontSize: "13px",
            lineHeight: "1.5",
            opacity: "0.85",
          }}
        >
          <FaFlask
            style={{
              marginTop: "3px",
              flexShrink: 0,
            }}
          />

          <span>
            <strong>
              Experimental Language Mode.
            </strong>{" "}
            Taglish combines English and
            Filipino speech. Caption and
            translation accuracy may vary
            depending on pronunciation,
            sentence structure, background
            noise, and mixed-language use.
          </span>
        </div>
      )}

      <div className="controls">

        <button
          className={
            listening
              ? "btn stop"
              : "btn start"
          }
          onClick={toggleListen}
        >
          {listening ? (
            <>
              <FaStop />
              Stop Listening
            </>
          ) : (
            <>
              <FaPlay />
              Start Listening
            </>
          )}
        </button>

        <button
          className="btn clear"
          onClick={clearCaption}
        >
          <FaEraser />
          Clear
        </button>

      </div>

      <div className="caption-box scrollable">

        {fullCaption || (
          <>
            <FaHeadphones />
            Speak now...
          </>
        )}

      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "18px",
          borderRadius: "14px",
          border:
            "1px solid rgba(255,255,255,0.10)",
          background:
            "rgba(255,255,255,0.04)",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            fontWeight: "700",
          }}
        >
          <FaSignLanguage />

          <span>
            Automatic FSL Phrase Detection
          </span>
        </div>

        {detectedFslPhrase ? (
          <div>

            <div
              style={{
                fontSize: "12px",
                opacity: "0.65",
                marginBottom: "6px",
              }}
            >
              MATCHED PHRASE
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "700",
                marginBottom: "4px",
              }}
            >
              {
                detectedFslPhrase.phrase
              }
            </div>

            <div
              style={{
                fontSize: "15px",
                opacity: "0.8",
                marginBottom: "12px",
              }}
            >
              {
                detectedFslPhrase.filipino
              }
            </div>

            {detectedFslPhrase.video ? (
              <video
                key={
                  detectedFslPhrase.video
                }
                src={
                  detectedFslPhrase.video
                }
                controls
                playsInline
                muted
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  borderRadius: "12px",
                  background: "#000",
                }}
              >
                Your browser does not
                support video playback.
              </video>
            ) : (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  border:
                    "1px dashed rgba(255,255,255,0.18)",
                  textAlign: "center",
                  opacity: "0.75",
                }}
              >

                <FaPlayCircle
                  style={{
                    fontSize: "28px",
                    marginBottom: "8px",
                  }}
                />

                <div
                  style={{
                    fontWeight: "700",
                  }}
                >
                  FSL video coming soon
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  The supported FSL clip
                  will automatically
                  appear here.
                </div>

              </div>
            )}

          </div>
        ) : (
          <div
            style={{
              opacity: "0.65",
              lineHeight: "1.5",
            }}
          >
            No supported FSL phrase
            detected right now. HearMe
            will automatically display
            the newest supported phrase.
          </div>
        )}

      </div>

      <div className="translated-box">

        {translated ? (
          <>
            <FaGlobe />
            {translated}
          </>
        ) : translationStatus ? (
          <>
            <FaGlobe />
            {translationStatus}
          </>
        ) : (
          <>
            <FaGlobe />
            Translation will appear here
          </>
        )}

      </div>

    </section>
  );
}

/*
  NORMAL TRANSLATION
*/
async function translateText(
  text,
  sourceMode,
  targetLang
) {
  const source =
    inputModeToTranslationCode(
      sourceMode
    );

  const target =
    targetLanguageToCode(
      targetLang
    );

  if (source === target) {
    return text;
  }

  return await translateByCode(
    text,
    source,
    target
  );
}

/*
  TAGLISH PIPELINE

  Taglish -> English -> Target

  This avoids treating Taglish as
  pure Tagalog when translating
  into Filipino or Spanish.
*/
async function translateTaglish(
  text,
  targetLang
) {
  /*
    First normalize mixed Taglish
    into English.
  */
  const english =
    await translateByCode(
      text,
      "tl",
      "en"
    );

  if (!english) {
    return "";
  }

  console.log(
    "Taglish bridge English:",
    english
  );

  /*
    If English is the final target,
    return the bridge result directly.
  */
  if (targetLang === "en") {
    return english;
  }

  /*
    Experimental Taglish output.
  */
  if (targetLang === "taglish") {
    return convertEnglishToTaglish(
      english
    );
  }

  const target =
    targetLanguageToCode(
      targetLang
    );

  if (target === "en") {
    return english;
  }

  /*
    English -> Filipino / Spanish
  */
  const finalTranslation =
    await translateByCode(
      english,
      "en",
      target
    );

  return finalTranslation;
}

/*
  PROVIDER HANDLER

  Chrome first
  MyMemory fallback
*/
async function translateByCode(
  text,
  source,
  target
) {
  if (
    !text?.trim()
  ) {
    return "";
  }

  if (source === target) {
    return text;
  }

  try {
    const chromeResult =
      await translateWithChrome(
        text,
        source,
        target
      );

    if (chromeResult) {
      console.log(
        `Translation provider: Chrome Translator (${source} → ${target})`
      );

      return chromeResult;
    }
  } catch (error) {
    console.warn(
      "Chrome Translator unavailable:",
      error
    );
  }

  try {
    const memoryResult =
      await translateWithMyMemory(
        text,
        source,
        target
      );

    if (memoryResult) {
      console.log(
        `Translation provider: MyMemory (${source} → ${target})`
      );

      return memoryResult;
    }
  } catch (error) {
    console.error(
      "MyMemory translation error:",
      error
    );
  }

  return "";
}

async function translateWithChrome(
  text,
  sourceLanguage,
  targetLanguage
) {
  if (
    !("Translator" in window)
  ) {
    return "";
  }

  const availability =
    await window.Translator.availability({
      sourceLanguage,
      targetLanguage,
    });

  if (
    availability ===
    "unavailable"
  ) {
    return "";
  }

  const translator =
    await window.Translator.create({
      sourceLanguage,
      targetLanguage,

      monitor(monitor) {
        monitor.addEventListener(
          "downloadprogress",
          (event) => {
            console.log(
              `Translation language pack: ${Math.round(
                event.loaded * 100
              )}%`
            );
          }
        );
      },
    });

  const result =
    await translator.translate(
      text
    );

  return result?.trim() || "";
}

async function translateWithMyMemory(
  text,
  sourceLanguage,
  targetLanguage
) {
  const url =
    "https://api.mymemory.translated.net/get" +
    `?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(
      `${sourceLanguage}|${targetLanguage}`
    )}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `MyMemory HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  const translatedText =
    data?.responseData
      ?.translatedText;

  if (
    typeof translatedText ===
      "string" &&
    translatedText.trim()
  ) {
    return decodeHtmlEntities(
      translatedText
    ).trim();
  }

  return "";
}

/*
  NON-TAGLISH INPUT
  -> TAGLISH OUTPUT

  Experimental only.
*/
async function convertToTaglish(
  text,
  sourceMode
) {
  const english =
    await translateText(
      text,
      sourceMode,
      "en"
    );

  if (!english) {
    return "";
  }

  return convertEnglishToTaglish(
    english
  );
}

/*
  SIMPLE TAGLISH OUTPUT

  This is only a lightweight
  experimental presentation layer.
*/
function convertEnglishToTaglish(
  english
) {
  return english
    .replace(
      /\bGood morning\b/gi,
      "Good morning"
    )
    .replace(
      /\bteacher\b/gi,
      "teacher"
    )
    .replace(
      /\bclass\b/gi,
      "class"
    )
    .replace(
      /\blesson\b/gi,
      "lesson"
    )
    .replace(
      /\bscience\b/gi,
      "science"
    )
    .replace(
      /\bpresentation\b/gi,
      "presentation"
    );
}

function inputModeToTranslationCode(
  mode
) {
  const map = {
    "en-US": "en",
    "fil-PH": "tl",

    /*
      Taglish is handled separately
      by translateTaglish().
    */
    taglish: "tl",
  };

  return map[mode] || "en";
}

function getSpeechRecognitionLanguage(
  mode
) {
  const map = {
    "en-US": "en-US",
    "fil-PH": "fil-PH",
    taglish: "fil-PH",
  };

  return map[mode] || "en-US";
}

function targetLanguageToCode(
  language
) {
  const map = {
    en: "en",
    tl: "tl",
    es: "es",
    taglish: "tl",
  };

  return map[language] || "en";
}

function decodeHtmlEntities(
  text
) {
  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.innerHTML = text;

  return textarea.value;
}

/*
  FSL MATCHING
*/
function findLatestFslMatch(
  text
) {
  if (!text?.trim()) {
    return null;
  }

  const normalizedText =
    normalizeText(text);

  let bestMatch = null;

  fslPhrases.forEach(
    (phraseItem) => {
      const keywords =
        phraseItem.keywords?.length
          ? phraseItem.keywords
          : [
              phraseItem.phrase,
              phraseItem.filipino,
            ];

      keywords.forEach(
        (keyword) => {
          const normalizedKeyword =
            normalizeText(keyword);

          if (!normalizedKeyword) {
            return;
          }

          const positions =
            findPhrasePositions(
              normalizedText,
              normalizedKeyword
            );

          positions.forEach(
            (index) => {
              const candidate = {
                phrase:
                  phraseItem,

                index,

                keywordLength:
                  normalizedKeyword.length,
              };

              if (
                !bestMatch ||
                candidate.index >
                  bestMatch.index ||
                (
                  candidate.index ===
                    bestMatch.index &&
                  candidate.keywordLength >
                    bestMatch.keywordLength
                )
              ) {
                bestMatch =
                  candidate;
              }
            }
          );
        }
      );
    }
  );

  return bestMatch;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(
      /[^a-z0-9áéíóúñü'\s]/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function findPhrasePositions(
  text,
  phrase
) {
  const positions = [];

  const escapedPhrase =
    phrase.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex =
    new RegExp(
      `(^|\\s)(${escapedPhrase})(?=\\s|$)`,
      "gi"
    );

  let match;

  while (
    (match =
      regex.exec(text)) !== null
  ) {
    const leadingSpace =
      match[1]?.length || 0;

    positions.push(
      match.index +
        leadingSpace
    );

    if (
      regex.lastIndex ===
      match.index
    ) {
      regex.lastIndex++;
    }
  }

  return positions;
}