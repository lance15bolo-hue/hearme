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

  const [
    fslPlaybackQueue,
    setFslPlaybackQueue,
  ] = useState([]);

  const recognitionRef =
    useRef(null);

  const shouldBeListeningRef =
    useRef(false);

    const microphonePermissionDeniedRef =
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
    event.error === "not-allowed" ||
    event.error === "service-not-allowed"
  ) {
    microphonePermissionDeniedRef.current =
      true;

    shouldBeListeningRef.current =
      false;

    addToast?.(
      "Microphone permission is blocked. Please allow microphone access in your browser settings and try again.",
      "error"
    );

    return;
  }

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
  shouldBeListeningRef.current &&
  !microphonePermissionDeniedRef.current
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

    setFslPlaybackQueue(
      (previousQueue) => [
        ...previousQueue,
        {
          key: matchKey,
          phrase: match.phrase,
        },
      ]
    );
  }, [fullCaption]);

  /*
    Play detected FSL clips one at
    a time in the order detected.
  */
  useEffect(() => {
    if (
      detectedFslPhrase ||
      fslPlaybackQueue.length === 0
    ) {
      return;
    }

    const [
      nextItem,
      ...remainingItems
    ] = fslPlaybackQueue;

    setDetectedFslPhrase(
      nextItem
    );

    setFslPlaybackQueue(
      remainingItems
    );

    /*
      A phrase without a verified
      video stays visible for six
      seconds before the next item.
    */
    if (!nextItem.phrase.video) {
      fslClearTimerRef.current =
        setTimeout(() => {
          setDetectedFslPhrase(
            null
          );
        }, 6000);
    }
  }, [
    detectedFslPhrase,
    fslPlaybackQueue,
  ]);

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

  const resetFslPlayback = () => {
    setDetectedFslPhrase(null);
    setFslPlaybackQueue([]);

    lastMatchKeyRef.current =
      null;

    if (
      fslClearTimerRef.current
    ) {
      clearTimeout(
        fslClearTimerRef.current
      );

      fslClearTimerRef.current =
        null;
    }
  };

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

       microphonePermissionDeniedRef.current =
         false;

      setCaption("");
      setInterimCaption("");
      setTranslated("");
      setTranslationStatus("");

      resetFslPlayback();

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

    resetFslPlayback();

    translationRequestRef.current++;
  };

  const handleDetectedFslVideoReady =
    (event) => {
      const video =
        event.currentTarget;

      video.muted = true;

      const playRequest =
        video.play();

      if (
        playRequest !== undefined
      ) {
        playRequest.catch(
          (error) => {
            console.warn(
              "Detected FSL autoplay was blocked:",
              error
            );
          }
        );
      }
    };

  const handleDetectedFslVideoEnd =
    () => {
      if (
        fslClearTimerRef.current
      ) {
        clearTimeout(
          fslClearTimerRef.current
        );
      }

      /*
        Short natural pause before
        the next queued clip.
      */
      fslClearTimerRef.current =
        setTimeout(() => {
          setDetectedFslPhrase(
            null
          );
        }, 350);
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

      resetFslPlayback();
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
            alignItems:
              "flex-start",
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

      {/* ==============================
          TRANSLATION DISPLAY
          Placed directly below captions
         ============================== */}
      <div className="translated-box translation-primary">
        <div className="translation-primary-label">
          <FaGlobe />
          <span>Translation</span>
        </div>

        <div
          className={
            translated
              ? "translation-primary-text"
              : "translation-primary-placeholder"
          }
        >
          {translated
            ? translated
            : translationStatus
            ? translationStatus
            : "Translation will appear here"}
        </div>
      </div>

      {/* ==============================
          COMPACT FSL DETECTION STATUS
          Actual video remains handled by
          the existing floating FSL player
         ============================== */}
      <div className="fsl-detection-compact">
        <div className="fsl-detection-compact-header">
          <FaSignLanguage />

          <span>
            Automatic FSL Phrase Detection
          </span>
        </div>

        {detectedFslPhrase ? (
          <div className="fsl-detection-compact-match">
            <div className="fsl-detection-compact-info">
              <span className="fsl-detection-compact-label">
                MATCHED PHRASE
              </span>

              <strong>
                {
                  detectedFslPhrase
                    .phrase.phrase
                }
              </strong>

              <span className="fsl-detection-compact-filipino">
                {
                  detectedFslPhrase
                    .phrase.filipino
                }
              </span>
            </div>

            {detectedFslPhrase
              .phrase.video ? (
              <video
                key={
                  detectedFslPhrase.key
                }
                src={
                  detectedFslPhrase
                    .phrase.video
                }
                autoPlay
                muted
                playsInline
                preload="auto"
                onCanPlay={
                  handleDetectedFslVideoReady
                }
                onEnded={
                  handleDetectedFslVideoEnd
                }
                style={{
                  display: "block",
                  width: "auto",
                  height: "300px",
                  maxWidth: "100%",
                  maxHeight: "52vh",
                  margin: "0 auto",
                  borderRadius: "12px",
                  objectFit: "contain",
                  background:
                    "transparent",
                }}
              >
                Your browser does not
                support video playback.
              </video>
            ) : (
              <div className="fsl-detection-no-video">
                <FaPlayCircle />

                <div>
                  <strong>
                    FSL video coming soon
                  </strong>

                  <span>
                    Supported video will
                    appear automatically.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="fsl-detection-compact-empty">
            No supported FSL phrase detected
            right now. Supported phrases will
            automatically play in the order
            they are detected.
          </div>
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
*/
async function translateTaglish(
  text,
  targetLang
) {
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

  if (targetLang === "en") {
    return english;
  }

  if (
    targetLang === "taglish"
  ) {
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

  return await translateByCode(
    english,
    "en",
    target
  );
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
  if (!text?.trim()) {
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

  /*
    Normalize the original caption
    and the returned source segments
    so punctuation and capitalization
    do not affect exact comparison.
  */
  const normalizeSegment = (
    value
  ) => {
    return String(value || "")
      .toLowerCase()
      .replace(
        /[^a-z0-9áéíóúñü'\s]/gi,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  };

  const normalizedInput =
    normalizeSegment(text);

  const matches =
    Array.isArray(data?.matches)
      ? data.matches
      : [];

  /*
    Prefer only a reliable entry whose
    source segment exactly matches the
    current live caption.

    This prevents an unrelated stored
    translation such as "Welcome to
    Batangas" from being displayed.
  */
  const reliableExactMatches =
    matches
      .filter((item) => {
        const segment =
          normalizeSegment(
            item?.segment
          );

        const translation =
          typeof item?.translation ===
            "string"
            ? item.translation.trim()
            : "";

        const matchScore =
          Number(item?.match) || 0;

        const qualityScore =
          Number(item?.quality) || 0;

        return (
          segment ===
            normalizedInput &&
          translation &&
          matchScore >= 0.8 &&
          qualityScore >= 70
        );
      })
      .sort((first, second) => {
        const matchDifference =
          (Number(second?.match) ||
            0) -
          (Number(first?.match) ||
            0);

        if (matchDifference !== 0) {
          return matchDifference;
        }

        return (
          (Number(second?.quality) ||
            0) -
          (Number(first?.quality) ||
            0)
        );
      });

  const selectedMatch =
    reliableExactMatches[0];

  if (selectedMatch) {
    console.log(
      "MyMemory exact match selected:",
      {
        match:
          selectedMatch.match,
        quality:
          selectedMatch.quality,
        reference:
          selectedMatch.reference,
      }
    );

    return decodeHtmlEntities(
      selectedMatch.translation
    ).trim();
  }

  /*
    Do not blindly use
    responseData.translatedText.
    It may contain an unrelated
    translation-memory result.
  */
  console.warn(
    "MyMemory result rejected: no reliable exact match.",
    {
      sourceLanguage,
      targetLanguage,
      text,
    }
  );

  return "";
}

/*
  NON-TAGLISH INPUT
  -> TAGLISH OUTPUT
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
    .replace(
      /[’‘]/g,
      "'"
    )
    .replace(
      /[^a-z0-9áéíóúñü'\s]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
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