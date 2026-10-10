import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import {
  db,
} from "../firebase";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { useRecording } from "../context/RecordingContext";


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
import DhhResponseAssistant from "./DhhResponseAssistant";
import "./CaptioningPanel.css";

export default function CaptioningPanel({
  user,
  addToast,
  onLoginRequest,
}) {

const {
  isRecording,
  startRecording,
  stopRecording,
  recordingUrl,
  recordingStartedAtRef,
  waitForUpload,
} = useRecording();

  const [listening, setListening] =
    useState(false);

const [caption, setCaption] =
  useState("");

const [
  interimCaption,
  setInterimCaption,
] = useState("");


// PERMANENT SESSION TRANSCRIPT
// Hindi nawawala kahit mag-clear ang live caption box
const [
  sessionTranscript,
  setSessionTranscript
] = useState("");

  // Permanent cumulative translation for the saved academic session.
  // This remains intact even when the live translation display clears.
  const [translated, setTranslated] =
    useState("");

  // Live translation display: only the latest translated speech segment.
  const [liveTranslation, setLiveTranslation] =
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


const [
  fslHistory,
  setFslHistory,
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

const silenceTimerRef =
  useRef(null);

const translationRequestRef =
  useRef(0);

const translationQueueRef =
  useRef(Promise.resolve());

// Prevent an older queued translation from replacing a newer live result.
const translationSegmentSequenceRef =
  useRef(0);

const liveTranslationClearTimerRef =
  useRef(null);

const previousTranscriptRef =
  useRef("");

const translationSegmentsRef =
  useRef([]);

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

    // Recording states
// Recording is handled by RecordingContext


const [
  sessionRecordingUrl,
] = useState("");

  useEffect(() => {

  const savedSession =
    sessionStorage.getItem(
      "hearme_pending_session"
    );


  if (savedSession) {

    const data =
      JSON.parse(savedSession);


    setSubject(
      data.subject || ""
    );

    setInstructor(
      data.instructor || ""
    );

    setSessionDate(
      data.sessionDate || ""
    );

    setContext(
      data.context || ""
    );

    setCaption(
      data.caption || ""
    );

    setSessionTranscript(
  data.sessionTranscript || ""
);

    setTranslated(
      data.translated || ""
    );

    setFslHistory(
  data.fslHistory || []
);

  }

}, []);

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
      event.results[i][0].transcript.trim();

    if (
      event.results[i].isFinal
    ) {
      finalText += transcript + " ";
    } else {
      interimText += transcript + " ";
    }
  }

  if (finalText.trim()) {


  // ===============================
  // 1. SAVE PERMANENT TRANSCRIPT
  // ===============================

  setSessionTranscript((previous) => {

    const updatedText =
      `${previous} ${finalText}`.trim();


    const words =
      updatedText.split(/\s+/);


    const cleanedWords =
      words.filter(
        (word, index) =>
          word.toLowerCase() !==
          words[index - 1]?.toLowerCase()
      );


    return cleanedWords.join(" ");

  });



  // ===============================
  // 2. LIVE CAPTION DISPLAY ONLY
  // ===============================

  setCaption(
    finalText.trim()
  );



  // ===============================
  // 3. CLEAR INTERIM
  // ===============================

  setInterimCaption("");

  if (liveTranslationClearTimerRef.current) {
    clearTimeout(liveTranslationClearTimerRef.current);
    liveTranslationClearTimerRef.current = null;
  }

  setLiveTranslation("");



  // ===============================
  // 4. RESET SILENCE TIMER
  // ===============================

  if (silenceTimerRef.current) {

    clearTimeout(
      silenceTimerRef.current
    );

  }



silenceTimerRef.current =
  setTimeout(() => {


    // CLEAR ONLY LIVE DISPLAY

    setCaption("");

    setInterimCaption("");

    if (liveTranslationClearTimerRef.current) {
      clearTimeout(liveTranslationClearTimerRef.current);
      liveTranslationClearTimerRef.current = null;
    }

    setLiveTranslation("");


    /*
      Reset the last FSL match after the
      current speech has finished.

      This allows the same phrase to be
      detected again in a new utterance.
    */
    lastMatchKeyRef.current =
      null;


  }, 3000);


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

    IMPORTANT:
    Only finalized speech is used for FSL
    detection.

    Interim speech is intentionally excluded
    so the same phrase is not detected twice
    while the browser is still building the
    final transcript.
  */
  useEffect(() => {

    if (!caption.trim()) {
      return;
    }


    const match =
      findLatestFslMatch(
        caption
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

          phrase:
            match.phrase,
        },
      ]
    );


    setFslHistory(
      (previousHistory) => [
        ...previousHistory,

        {
          key: matchKey,

          phrase:
            match.phrase.phrase,

          filipino:
            match.phrase.filipino,

          detectedAt:
            new Date().toISOString(),

          // Relative position inside the saved recording.
          // This is intentionally separate from detectedAt so older
          // sessions remain readable while new sessions can be replayed
          // against the audio timeline.
          recordingOffsetSeconds:
            recordingStartedAtRef.current
              ? Math.max(
                  0,
                  (Date.now() -
                    recordingStartedAtRef.current) /
                    1000
                )
              : null,

          // Keep the original millisecond field for backward compatibility
          // with sessions saved by the first synchronized replay version.
          recordingOffsetMs:
            recordingStartedAtRef.current
              ? Math.max(
                  0,
                  Date.now() -
                    recordingStartedAtRef.current
                )
              : null,
        },
      ]
    );


  }, [caption, recordingStartedAtRef]);

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

      if (
        liveTranslationClearTimerRef.current
      ) {
        clearTimeout(
          liveTranslationClearTimerRef.current
        );
      }
    };
  }, []);

    /*
    TRANSLATION QUEUE

    Each newly finalized speech segment is
    translated separately and appended to the
    existing session translation.

    useCallback keeps the helper stable so
    React's exhaustive-deps rule is satisfied.
  */
  const queueTranslationSegment =
    useCallback(
      (text) => {

        const cleanText =
          String(text || "").trim();

        if (!cleanText) {
          return;
        }


        const requestId =
          translationRequestRef.current;

        const segmentId =
          ++translationSegmentSequenceRef.current;

        const sourceMode =
          inputMode;

        const destinationLanguage =
          targetLang;


        translationQueueRef.current =
          translationQueueRef.current
            .catch(() => "")
            .then(async () => {

              if (
                requestId !==
                translationRequestRef.current
              ) {
                return;
              }


              setTranslationStatus(
                "Translating..."
              );


              let result = "";


              if (
                sourceMode === "taglish"
              ) {

                result =
                  await translateTaglish(
                    cleanText,
                    destinationLanguage
                  );

              } else if (
                destinationLanguage ===
                "taglish"
              ) {

                result =
                  await convertToTaglish(
                    cleanText,
                    sourceMode
                  );

              } else {

                result =
                  await translateText(
                    cleanText,
                    sourceMode,
                    destinationLanguage
                  );

              }


              if (
                requestId !==
                translationRequestRef.current
              ) {
                return;
              }


              if (result) {

                const cleanResult =
                  result.trim();

                // Keep the complete cumulative translation for saving/History.
                setTranslated(
                  (previous) => {

                    const existing =
                      String(
                        previous || ""
                      ).trim();


                    if (!existing) {
                      return cleanResult;
                    }


                    return (
                      `${existing} ${cleanResult}`
                    ).trim();

                  }
                );

                // Show only the newest translated speech in the live UI.
                if (
                  segmentId ===
                  translationSegmentSequenceRef.current
                ) {
                  setLiveTranslation(
                    cleanResult
                  );

                  if (
                    liveTranslationClearTimerRef.current
                  ) {
                    clearTimeout(
                      liveTranslationClearTimerRef.current
                    );
                  }

                  liveTranslationClearTimerRef.current =
                    setTimeout(() => {
                      setLiveTranslation("");
                      liveTranslationClearTimerRef.current =
                        null;
                    }, 3000);

                  setTranslationStatus("");
                }

              } else {

                if (
                  segmentId ===
                  translationSegmentSequenceRef.current
                ) {
                  setTranslationStatus(
                    "Translation temporarily unavailable."
                  );
                }

              }

            })
            .catch((error) => {

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


              if (
                segmentId ===
                translationSegmentSequenceRef.current
              ) {
                setTranslationStatus(
                  "Translation temporarily unavailable."
                );
              }

            });

      },
      [
        inputMode,
        targetLang,
      ]
    );


  /*
    Watch the permanent session transcript.

    Only the newly added finalized speech
    is sent to the translation provider.
  */
  useEffect(() => {

    const currentTranscript =
      sessionTranscript.trim();


    if (!currentTranscript) {

      previousTranscriptRef.current =
        "";

      return;

    }


    const previousTranscript =
      previousTranscriptRef.current;


    if (
      currentTranscript ===
      previousTranscript
    ) {
      return;
    }


    let newSegment = "";


    if (
      previousTranscript &&
      currentTranscript.startsWith(
        previousTranscript
      )
    ) {

      newSegment =
        currentTranscript
          .slice(
            previousTranscript.length
          )
          .trim();

    } else {

      /*
        Transcript was replaced or reset.
        Start a fresh translation sequence.
      */

      translationSegmentsRef.current =
        [];


      translationRequestRef.current++;


      translationQueueRef.current =
        Promise.resolve();


      setTranslated("");

      if (liveTranslationClearTimerRef.current) {
        clearTimeout(liveTranslationClearTimerRef.current);
        liveTranslationClearTimerRef.current = null;
      }

      setLiveTranslation("");


      newSegment =
        currentTranscript;

    }


    previousTranscriptRef.current =
      currentTranscript;


    if (!newSegment) {
      return;
    }


    translationSegmentsRef.current.push(
      newSegment
    );


    queueTranslationSegment(
      newSegment
    );


  }, [
    sessionTranscript,
    queueTranslationSegment,
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

    const handleStartRecording = async () => {

    /*
      Starting an explicit recording creates
      a new recording-session boundary.

      Any captioning, translation, or FSL
      detections made before recording started
      must not be carried into this recorded
      session.
    */

    setCaption("");

setInterimCaption("");

setSessionTranscript("");

setTranslated("");

if (liveTranslationClearTimerRef.current) {
  clearTimeout(liveTranslationClearTimerRef.current);
  liveTranslationClearTimerRef.current = null;
}

setLiveTranslation("");

setTranslationStatus("");

setFslHistory([]);

resetFslPlayback();


previousTranscriptRef.current =
  "";

translationSegmentsRef.current =
  [];

translationRequestRef.current++;

translationQueueRef.current =
  Promise.resolve();


await startRecording();

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
      setTranslationStatus("");

      resetFslPlayback();

      shouldBeListeningRef.current =
        true;

      /*
        Start recording only if recording
        is not already active.

        IMPORTANT:
        Stop Listening will NOT stop recording.
      */
      

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

  if (liveTranslationClearTimerRef.current) {
    clearTimeout(liveTranslationClearTimerRef.current);
    liveTranslationClearTimerRef.current = null;
  }

  setLiveTranslation("");

  setTranslationStatus("");

  resetFslPlayback();

  translationRequestRef.current++;
  translationQueueRef.current =
  Promise.resolve();

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

      if (liveTranslationClearTimerRef.current) {
        clearTimeout(liveTranslationClearTimerRef.current);
        liveTranslationClearTimerRef.current = null;
      }

      setLiveTranslation("");
      setTranslationStatus("");

      resetFslPlayback();
    };  

const saveSession = async () => {

  // Guest users cannot save transcript history
  if (!user?.uid || user?.role === "guest") {

    addToast?.(
      "Please login to save transcript history.",
      "info"
    );

    return;
  }


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

    const finalRecordingUrl =
      await waitForUpload();


    await addDoc(
      collection(
        db,
        "academicSessions"
      ),
      {
        userId: user.uid,

        subject,

        instructor,

        sessionDate,

        context,

        captions:
          sessionTranscript || caption || "",

        translated,

        fslHistory,

        recordingUrl:
          finalRecordingUrl ||
          sessionRecordingUrl ||
          recordingUrl ||
          "",

        inputMode,

        languageOutput:
          targetLang,

        sessionStatus:
          "completed",

        createdAt:
          serverTimestamp(),
      }
    );


    addToast?.(
      "Academic session saved!",
      "success"
    );


    /*
      RESET SESSION STATE

      The saved session has already been
      written to Firestore.

      Everything below prepares Captioning
      for a completely fresh session.
    */

    setSubject("");

    setInstructor("");

    setSessionDate("");

    setContext("");

    setCaption("");

    setInterimCaption("");

    setSessionTranscript("");

    setTranslated("");

    if (liveTranslationClearTimerRef.current) {
      clearTimeout(liveTranslationClearTimerRef.current);
      liveTranslationClearTimerRef.current = null;
    }

    setLiveTranslation("");

    setTranslationStatus("");

    setFslHistory([]);

    resetFslPlayback();

    translationRequestRef.current++;


    /*
      Remove any pending session data that
      may have been stored before login.
    */
    sessionStorage.removeItem(
      "hearme_pending_session"
    );


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

       <div className="recording-controls">

  <button
  className={
    isRecording
      ? "btn_academic-btn recording-active"
      : "btn_academic-btn"
  }
  onClick={
    isRecording
      ? stopRecording
      : handleStartRecording
  }
>
    {
      isRecording
        ? "Stop Recording"
        : "Start Recording"
    }
  </button>

</div>


{user?.uid ? (
  <button
    className="btn_academic-btn"
    onClick={saveSession}
  >
    <FaSave />
    Save Session
  </button>
) : (
  <button
  className="btn_academic-btn"
  onClick={() => {

  sessionStorage.setItem(
    "hearme_pending_session",
    JSON.stringify({
  subject,
  instructor,
  sessionDate,
  context,
  caption,
  translated,
  fslHistory,
  sessionTranscript,
  recordingUrl
})
  );

  onLoginRequest();

}}
  title="Login required to save sessions"
>
  <FaSave />
  Login to Save
</button>
)}
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
            liveTranslation
              ? "translation-primary-text"
              : "translation-primary-placeholder"
          }
        >
          {liveTranslation
            ? liveTranslation
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

        <DhhResponseAssistant />

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

async function translateWithGoogleCloud(
  text,
  sourceLanguage,
  targetLanguage
) {
  const apiKey =
    process.env.REACT_APP_GOOGLE_TRANSLATE_KEY;

  if (!apiKey) {
    console.warn(
      "Google Translation API key missing."
    );

    return "";
  }

  const url =
    "https://translation.googleapis.com/language/translate/v2";

  const response = await fetch(
    `${url}?key=${apiKey}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: "text",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Translation HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data?.data?.translations?.[0]
      ?.translatedText
      ?.trim() || ""
  );
}

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
  const googleResult =
    await translateWithGoogleCloud(
      text,
      source,
      target
    );


  if (googleResult) {

    console.log(
      `Translation provider: Google Cloud Translation (${source} → ${target})`
    );

    return googleResult;

  }

} catch (error) {

  console.warn(
    "Google Translation unavailable:",
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