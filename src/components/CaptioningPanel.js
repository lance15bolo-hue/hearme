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
import ClassroomAudioAdapter from "./ClassroomAudioAdapter";
import "./CaptioningPanel.css";

export default function CaptioningPanel({
  user,
  addToast,
  onLoginRequest,
  onTranscriptIngestionReady,
}) {

const {
  isRecording,
  startRecording,
  stopRecording,
  recordingUrl,
  recordingStartedAtRef,
  waitForUpload,
  setExternalRecordingStream,
} = useRecording();

  const [listening, setListening] =
    useState(false);

  const [classroomAudioActive, setClassroomAudioActive] =
    useState(false);

  // Classroom response state supplied by DhhResponseAssistant.
  const [classroomRoomCode, setClassroomRoomCode] =
    useState("");

  const [, setDhhResponses] =
    useState([]);

  // Synchronous classroom-response mirror used by Save Session. The live
  // response feed can update asynchronously, so saving from React state
  // alone can miss the newest response.
  const dhhResponsesRef = useRef([]);
  const classroomRoomCodeRef = useRef("");
  const sessionClassroomRoomCodeRef = useRef("");

  const handleClassroomStateChange = useCallback(
    ({ roomCode = "", responses = [] } = {}) => {
      const nextRoomCode = String(roomCode || "");
      const nextResponses = Array.isArray(responses) ? responses : [];

      // A different classroom room starts a new classroom-response feed.
      if (
        nextRoomCode &&
        classroomRoomCodeRef.current &&
        classroomRoomCodeRef.current !== nextRoomCode
      ) {
        dhhResponsesRef.current = [];
      }

      classroomRoomCodeRef.current = nextRoomCode;

      if (nextRoomCode) {
        sessionClassroomRoomCodeRef.current = nextRoomCode;
        dhhResponsesRef.current = nextResponses;
      }

      setClassroomRoomCode(nextRoomCode);
      setDhhResponses(nextResponses);
    },
    []
  );

  // Audio stream supplied by the classroom adapter. It is used only when
  // the user starts a recording while classroom audio is active.
  const classroomAudioStreamRef = useRef(null);

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

// Synchronous transcript mirror used by the shared ingestion boundary.
// This prevents two finalized segments arriving before React re-renders
// from appending against the same stale transcript value.
const sessionTranscriptRef = useRef("");

// Prevent the same finalized segment from being inserted twice in a row.
// This is reset after the existing three-second speech-silence window and
// whenever a new session begins.
const lastIngestedSegmentRef = useRef("");

  // Permanent cumulative translation for the saved academic session.
  // This remains intact even when the live translation display clears.
  const [translated, setTranslated] =
    useState("");

  // Synchronous mirror of the permanent translation used by Save Session.
  // This prevents a just-completed translation from being missed when the
  // user saves before React has finished the next render.
  const translatedRef = useRef("");

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

  // Synchronous FSL history mirror used by Save Session so the latest
  // detected event is persisted even if React has not rendered the state
  // update yet.
  const fslHistoryRef = useRef([]);

  const recognitionRef =
    useRef(null);

  const shouldBeListeningRef =
    useRef(false);

    const microphonePermissionDeniedRef =
    useRef(false);

  // Tracks FSL phrase occurrences already queued during the current
  // live utterance. This allows multiple different FSL phrases in one
  // classroom sentence while preventing repeated re-detection of the
  // same interim result.
  const detectedFslOccurrenceKeysRef =
    useRef(new Set());

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

const liveTranslationDebounceTimerRef =
  useRef(null);

const liveTranslationRequestRef =
  useRef(0);

const previousTranscriptRef =
  useRef("");

const translationSegmentsRef =
  useRef([]);

// Live display should feel realtime: after the speaker stops,
// clear the visible caption/translation quickly while keeping
// the permanent transcript and recording untouched.
const LIVE_SILENCE_CLEAR_MS = 1500;
const LIVE_TRANSLATION_CLEAR_MS = 1500;
const LIVE_TRANSLATION_DEBOUNCE_MS = 700;

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

    const restoredTranscript =
      data.sessionTranscript || "";

    sessionTranscriptRef.current =
      restoredTranscript;

    setSessionTranscript(
      restoredTranscript
    );

    const restoredTranslation =
      data.translated || "";

    translatedRef.current =
      restoredTranslation;

    setTranslated(
      restoredTranslation
    );

    const restoredFslHistory = Array.isArray(data.fslHistory)
      ? data.fslHistory
      : [];

    fslHistoryRef.current = restoredFslHistory;
    setFslHistory(restoredFslHistory);

  }

}, []);

  /*
    SHARED FINALIZED-TRANSCRIPT INGESTION

    Both the existing Web Speech API and a future classroom/meeting
    transcript source must submit finalized text through this function.
    Downstream translation remains driven by sessionTranscript, and FSL
    matching remains driven by caption; this function does not create a
    second translation or FSL processing path.
  */
  const clearLiveSpeechDisplay =
    useCallback(() => {
      setCaption("");
      setInterimCaption("");

      if (liveTranslationClearTimerRef.current) {
        clearTimeout(
          liveTranslationClearTimerRef.current
        );
        liveTranslationClearTimerRef.current = null;
      }

      if (liveTranslationDebounceTimerRef.current) {
        clearTimeout(
          liveTranslationDebounceTimerRef.current
        );
        liveTranslationDebounceTimerRef.current = null;
      }

      liveTranslationRequestRef.current++;
      setLiveTranslation("");

      // A silence boundary starts a fresh live utterance. Previously
      // detected FSL occurrences are allowed again in the next utterance.
      detectedFslOccurrenceKeysRef.current.clear();
      lastIngestedSegmentRef.current = "";
    }, []);

  const scheduleLiveSpeechClear =
    useCallback(() => {
      if (silenceTimerRef.current) {
        clearTimeout(
          silenceTimerRef.current
        );
      }

      silenceTimerRef.current =
        setTimeout(() => {
          clearLiveSpeechDisplay();
          silenceTimerRef.current = null;
        }, LIVE_SILENCE_CLEAR_MS);
    }, [clearLiveSpeechDisplay]);

  const cancelLiveSpeechClear =
    useCallback(() => {
      if (silenceTimerRef.current) {
        clearTimeout(
          silenceTimerRef.current
        );
        silenceTimerRef.current = null;
      }
    }, []);

  /*
    SHARED FINALIZED-TRANSCRIPT INGESTION

    Both the existing Web Speech API and the classroom audio adapter submit
    finalized text through this same function. The permanent transcript is
    still the source used for saved History/translation processing.
  */
  const ingestFinalizedTranscriptSegment =
    useCallback((segmentText, options = {}) => {
      const cleanSegment =
        String(segmentText || "")
          .trim()
          .replace(/\s+/g, " ");

      if (!cleanSegment) {
        return false;
      }

      const normalizedSegment =
        cleanSegment.toLocaleLowerCase();

      if (
        lastIngestedSegmentRef.current ===
        normalizedSegment
      ) {
        return false;
      }

      lastIngestedSegmentRef.current =
        normalizedSegment;

      const previousTranscript =
        sessionTranscriptRef.current;

      const updatedText =
        `${previousTranscript} ${cleanSegment}`.trim();

      const words =
        updatedText.split(/\s+/);

      const cleanedWords =
        words.filter(
          (word, index) =>
            word.toLowerCase() !==
            words[index - 1]?.toLowerCase()
        );

      const nextTranscript =
        cleanedWords.join(" ");

      sessionTranscriptRef.current =
        nextTranscript;

      setSessionTranscript(
        nextTranscript
      );

      const showLiveDisplay =
        options?.showLiveDisplay !== false;

      if (showLiveDisplay) {
        // Keep the finalized segment visible while the speaker is active.
        // The shared silence boundary clears only the live display; the
        // permanent transcript and recording remain untouched.
        setCaption(cleanSegment);
        setInterimCaption("");

        // Do not erase a live translation preview immediately when a final
        // result arrives. The preview can bridge the recognition/translation
        // latency until the finalized translation is ready.
        scheduleLiveSpeechClear();
      }

      return true;
    }, [scheduleLiveSpeechClear]);

  // Optional integration contract: a future parent/classroom module can
  // receive this function and call it with finalized transcript segments.
  // Passing null on cleanup tells the parent that this handler is no longer
  // registered. Existing App usage does not need to pass this prop.
  useEffect(() => {
    if (
      typeof onTranscriptIngestionReady !== "function"
    ) {
      return undefined;
    }

    onTranscriptIngestionReady(
      ingestFinalizedTranscriptSegment
    );

    return () => {
      onTranscriptIngestionReady(null);
    };
  }, [
    onTranscriptIngestionReady,
    ingestFinalizedTranscriptSegment,
  ]);

  /*
    LIVE TRANSLATION PREVIEW

    Interim speech is translated with a short debounce so the classroom UI
    does not wait for the browser to finalize a long teacher utterance.
    This preview never changes the permanent `translated` History value;
    finalized segments continue through the existing translation queue.
  */
  const queueLiveTranslationPreview =
    useCallback(
      (text) => {
        const cleanText =
          String(text || "")
            .trim()
            .replace(/\s+/g, " ");

        if (!cleanText || cleanText.length < 3) {
          return;
        }

        if (liveTranslationDebounceTimerRef.current) {
          clearTimeout(
            liveTranslationDebounceTimerRef.current
          );
        }

        const requestId =
          ++liveTranslationRequestRef.current;

        liveTranslationDebounceTimerRef.current =
          setTimeout(async () => {
            liveTranslationDebounceTimerRef.current =
              null;

            if (
              requestId !==
              liveTranslationRequestRef.current
            ) {
              return;
            }

            const sourceMode =
              inputMode;
            const destinationLanguage =
              targetLang;

            try {
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
                liveTranslationRequestRef.current
              ) {
                return;
              }

              if (result) {
                setLiveTranslation(
                  result.trim()
                );
                setTranslationStatus("");
              }
            } catch (error) {
              if (
                requestId ===
                liveTranslationRequestRef.current
              ) {
                console.warn(
                  "Live translation preview unavailable:",
                  error
                );
              }
            }
          }, LIVE_TRANSLATION_DEBOUNCE_MS);
      },
      [inputMode, targetLang]
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
          event.results[i][0].transcript.trim();

        if (
          event.results[i].isFinal
        ) {
          finalText += transcript + " ";
        } else {
          interimText += transcript + " ";
        }
      }

      const cleanInterimText =
        interimText.trim();

      if (cleanInterimText) {
        cancelLiveSpeechClear();
        setInterimCaption(
          cleanInterimText
        );
        queueLiveTranslationPreview(
          cleanInterimText
        );
      }

      if (finalText.trim()) {
        ingestFinalizedTranscriptSegment(
          finalText
        );
      }
    };

    rec.onspeechstart = () => {
      cancelLiveSpeechClear();
    };

    rec.onspeechend = () => {
      scheduleLiveSpeechClear();
    };

    rec.onsoundend = () => {
      scheduleLiveSpeechClear();
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

      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onspeechstart = null;
      rec.onspeechend = null;
      rec.onsoundend = null;

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
    cancelLiveSpeechClear,
    ingestFinalizedTranscriptSegment,
    queueLiveTranslationPreview,
    scheduleLiveSpeechClear,
  ]);

   /*
    FSL MATCHING

    FSL detection uses the newest available
    speech text so the clip can appear while
    the user is still speaking.

    Interim speech is used only as a live
    detection signal. The existing duplicate
    guard prevents the later finalized result
    from playing the same FSL clip again.
    Finalized speech remains the source used
    by the shared transcript and translation
    flow.
  */
  useEffect(() => {
    const fslDetectionText =
      interimCaption.trim() ||
      caption.trim();

    if (!fslDetectionText) {
      return;
    }

    const matches =
      findAllFslMatches(
        fslDetectionText
      );

    if (!matches.length) {
      return;
    }

    /*
      Once an FSL phrase is detected, let the FSL playback queue control
      the end of the current live display. This prevents the normal
      speech-silence timer and the translation preview timer from clearing
      the caption/translation while a detected FSL clip is still playing.
    */
    cancelLiveSpeechClear();

    if (liveTranslationClearTimerRef.current) {
      clearTimeout(
        liveTranslationClearTimerRef.current
      );
      liveTranslationClearTimerRef.current =
        null;
    }

    matches.forEach((match) => {
      const matchKey =
        `${match.phrase.id}-${match.normalizedKeyword}-${match.occurrenceIndex}`;

      if (
        detectedFslOccurrenceKeysRef.current.has(
          matchKey
        )
      ) {
        return;
      }

      detectedFslOccurrenceKeysRef.current.add(
        matchKey
      );

      setFslPlaybackQueue(
        (previousQueue) => [
          ...previousQueue,
          {
            key: matchKey,
            phrase: match.phrase,
          },
        ]
      );

      const nextFslHistoryItem = {
            key: matchKey,
            phrase:
              match.phrase.phrase,
            filipino:
              match.phrase.filipino,
            detectedAt:
              new Date().toISOString(),
            recordingOffsetSeconds:
              recordingStartedAtRef.current
                ? Math.max(
                    0,
                    (Date.now() -
                      recordingStartedAtRef.current) /
                      1000
                  )
                : null,
            recordingOffsetMs:
              recordingStartedAtRef.current
                ? Math.max(
                    0,
                    Date.now() -
                      recordingStartedAtRef.current
                  )
                : null,
          };

      fslHistoryRef.current = [
        ...fslHistoryRef.current,
        nextFslHistoryItem,
      ];

      setFslHistory(fslHistoryRef.current);
    });
  }, [
    caption,
    interimCaption,
    recordingStartedAtRef,
    cancelLiveSpeechClear,
  ]);

  /*
    Play detected FSL clips one at
    a time in the order detected.

    IMPORTANT:
    A phrase can be detected and saved to FSL History even when its
    corresponding video is not actually available. Such an item must NOT
    block the playback queue. Skip unavailable items and continue with the
    next playable FSL clip.
  */
  useEffect(() => {
    if (
      detectedFslPhrase ||
      fslPlaybackQueue.length === 0
    ) {
      return;
    }

    const playableIndex =
      fslPlaybackQueue.findIndex(
        (item) =>
          Boolean(
            item?.phrase?.video
          )
      );

    // Keep unavailable phrases in FSL History, but never let them occupy
    // the floating player or block the next available clip.
    if (playableIndex === -1) {
      setFslPlaybackQueue([]);
      return;
    }

    const nextItem =
      fslPlaybackQueue[playableIndex];

    const remainingItems =
      fslPlaybackQueue.filter(
        (_, index) =>
          index !== playableIndex
      );

    setDetectedFslPhrase(
      nextItem
    );

    setFslPlaybackQueue(
      remainingItems
    );
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

      if (
        liveTranslationDebounceTimerRef.current
      ) {
        clearTimeout(
          liveTranslationDebounceTimerRef.current
        );
      }

      if (silenceTimerRef.current) {
        clearTimeout(
          silenceTimerRef.current
        );
      }
    };
  }, []);

  const handleClassroomInterimTranscript =
    useCallback(
      (text) => {
        const cleanText =
          String(text || "")
            .trim()
            .replace(/\s+/g, " ");

        if (!cleanText) {
          return;
        }

        const normalizeClassroomText = (value) =>
          String(value || "")
            .toLocaleLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim()
            .replace(/\s+/g, " ");

        const incomingNorm =
          normalizeClassroomText(cleanText);
        const previousSegment =
          String(lastIngestedSegmentRef.current || "").trim();
        const previousSegmentNorm =
          normalizeClassroomText(previousSegment);
        const savedTranscript =
          String(sessionTranscriptRef.current || "").trim();
        const savedTranscriptNorm =
          normalizeClassroomText(savedTranscript);

        let filteredText = cleanText;

        if (
          previousSegmentNorm &&
          incomingNorm === previousSegmentNorm
        ) {
          // This is the previous finalized classroom utterance being
          // replayed as an interim result. Do not show or FSL-match it.
          return;
        }

        if (
          previousSegmentNorm &&
          incomingNorm.startsWith(previousSegmentNorm + " ")
        ) {
          const incomingWords = cleanText.split(/\s+/);
          const previousWordCount = previousSegmentNorm.split(" ").length;
          filteredText = incomingWords
            .slice(previousWordCount)
            .join(" ")
            .trim();
        } else if (
          savedTranscriptNorm &&
          incomingNorm.startsWith(savedTranscriptNorm + " ")
        ) {
          const incomingWords = cleanText.split(/\s+/);
          const savedWordCount = savedTranscriptNorm.split(" ").length;
          filteredText = incomingWords
            .slice(savedWordCount)
            .join(" ")
            .trim();
        }

        if (!filteredText) {
          return;
        }

        cancelLiveSpeechClear();
        setInterimCaption(filteredText);
        queueLiveTranslationPreview(
          filteredText
        );
      },
      [
        cancelLiveSpeechClear,
        queueLiveTranslationPreview,
      ]
    );

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

        const liveDisplayRequestId =
          liveTranslationRequestRef.current;

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
                // Update the ref first so Save Session can read the newest
                // translation even before React finishes rendering it.
                const existingTranslated =
                  String(
                    translatedRef.current || ""
                  ).trim();

                const nextTranslated =
                  existingTranslated
                    ? `${existingTranslated} ${cleanResult}`.trim()
                    : cleanResult;

                translatedRef.current =
                  nextTranslated;

                setTranslated(
                  nextTranslated
                );

                // Show only the newest translated speech in the live UI.
                if (
                  segmentId ===
                    translationSegmentSequenceRef.current &&
                  liveDisplayRequestId ===
                    liveTranslationRequestRef.current
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
                    }, LIVE_TRANSLATION_CLEAR_MS);

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


      translatedRef.current = "";
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

    detectedFslOccurrenceKeysRef.current.clear();

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

sessionTranscriptRef.current = "";
lastIngestedSegmentRef.current = "";

setSessionTranscript("");

translatedRef.current = "";
setTranslated("");

if (liveTranslationClearTimerRef.current) {
  clearTimeout(liveTranslationClearTimerRef.current);
  liveTranslationClearTimerRef.current = null;
}

if (liveTranslationDebounceTimerRef.current) {
  clearTimeout(liveTranslationDebounceTimerRef.current);
  liveTranslationDebounceTimerRef.current = null;
}

liveTranslationRequestRef.current++;
setLiveTranslation("");

setTranslationStatus("");

fslHistoryRef.current = [];
setFslHistory([]);

resetFslPlayback();


previousTranscriptRef.current =
  "";

translationSegmentsRef.current =
  [];

translationRequestRef.current++;

translationQueueRef.current =
  Promise.resolve();


// A new recording starts a fresh classroom-history boundary as well.
    dhhResponsesRef.current = [];
    sessionClassroomRoomCodeRef.current =
      classroomRoomCodeRef.current ||
      classroomRoomCode ||
      "";

    const classroomAudioStream =
      classroomAudioStreamRef.current;

    if (classroomAudioStream) {
      await startRecording(
        classroomAudioStream
      );
    } else {
      await startRecording();
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
      setTranslationStatus("");
      lastIngestedSegmentRef.current = "";

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

  if (silenceTimerRef.current) {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }

  if (liveTranslationDebounceTimerRef.current) {
    clearTimeout(liveTranslationDebounceTimerRef.current);
    liveTranslationDebounceTimerRef.current = null;
  }

  liveTranslationRequestRef.current++;
  detectedFslOccurrenceKeysRef.current.clear();

  translatedRef.current = "";
  setTranslated("");

  if (liveTranslationClearTimerRef.current) {
    clearTimeout(liveTranslationClearTimerRef.current);
    liveTranslationClearTimerRef.current = null;
  }

  setLiveTranslation("");

  setTranslationStatus("");
  lastIngestedSegmentRef.current = "";

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
        Short natural pause before the next queued clip.

        If there is no next FSL clip waiting, this was the final clip for
        the current live utterance. Clear the live caption and translation
        only after the final FSL video has finished.
      */
      const hasQueuedFsl =
        fslPlaybackQueue.length > 0;

      fslClearTimerRef.current =
        setTimeout(() => {
          setDetectedFslPhrase(
            null
          );

          if (!hasQueuedFsl) {
            clearLiveSpeechDisplay();
          }

          fslClearTimerRef.current =
            null;
        }, 350);
    };

  const handleDetectedFslVideoError =
    () => {
      /*
        A phrase may have a video path in the phrase catalog while the
        actual file is missing/unavailable. Do not let that failed player
        block later FSL clips. The phrase remains in FSL History because
        detection and video availability are intentionally separate.
      */
      console.warn(
        "FSL video unavailable; skipping to the next detected phrase."
      );

      if (
        fslClearTimerRef.current
      ) {
        clearTimeout(
          fslClearTimerRef.current
        );
        fslClearTimerRef.current =
          null;
      }

      setDetectedFslPhrase(
        null
      );

      if (fslPlaybackQueue.length === 0) {
        clearLiveSpeechDisplay();
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

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (liveTranslationDebounceTimerRef.current) {
        clearTimeout(liveTranslationDebounceTimerRef.current);
        liveTranslationDebounceTimerRef.current = null;
      }

      liveTranslationRequestRef.current++;
      detectedFslOccurrenceKeysRef.current.clear();

      translatedRef.current = "";
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

    // Wait for any translation already queued by the finalized transcript.
    // This prevents Save Session from capturing an empty/stale translation
    // while the provider request is still finishing.
    try {
      await translationQueueRef.current;
    } catch (error) {
      console.warn(
        "Waiting for translation before save failed:",
        error
      );
    }

    /*
      Use the synchronous transcript and translation refs first. Classroom
      recognition can finalize a segment immediately before Save Session,
      while React state may still be one render behind.
    */
    const finalTranscript =
      String(
        sessionTranscriptRef.current ||
          sessionTranscript ||
          caption ||
          interimCaption ||
          ""
      )
        .trim()
        .replace(/\s+/g, " ");

    const finalTranslated =
      String(
        translatedRef.current ||
          translated ||
          ""
      )
        .trim()
        .replace(/\s+/g, " " );


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
          finalTranscript,

        translated:
          finalTranslated,

        fslHistory: fslHistoryRef.current,

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

        classroomRoomCode:
          sessionClassroomRoomCodeRef.current ||
          classroomRoomCode ||
          "",

        dhhResponses: Array.isArray(dhhResponsesRef.current)
          ? dhhResponsesRef.current.map((response) => ({
              id: response?.id || "",
              userId: response?.userId || "",
              displayName:
                response?.displayName ||
                "Classroom participant",
              text: String(response?.text || ""),
              createdAt: response?.createdAt || null,
            }))
          : [],

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

    sessionTranscriptRef.current = "";

    setSessionTranscript("");

    translatedRef.current = "";
    setTranslated("");

    if (liveTranslationClearTimerRef.current) {
      clearTimeout(liveTranslationClearTimerRef.current);
      liveTranslationClearTimerRef.current = null;
    }

    setLiveTranslation("");

    setTranslationStatus("");

    fslHistoryRef.current = [];
    setFslHistory([]);

    dhhResponsesRef.current = [];
    sessionClassroomRoomCodeRef.current = "";
    classroomRoomCodeRef.current = "";
    setDhhResponses([]);
    setClassroomRoomCode("");

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
  title={
    classroomAudioStreamRef.current
      ? "Record the connected classroom audio source."
      : "Record from the direct microphone."
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
            disabled={classroomAudioActive}
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
          disabled={classroomAudioActive}
          title={
            classroomAudioActive
              ? "Stop Classroom Audio before using the microphone mode."
              : "Start or stop direct microphone listening."
          }
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

            <ClassroomAudioAdapter
        speechRecognitionLanguage={
          speechRecognitionLanguage
        }
        onFinalTranscript={
          ingestFinalizedTranscriptSegment
        }
        onInterimTranscript={
          handleClassroomInterimTranscript
        }
        onSpeechEnd={
          scheduleLiveSpeechClear
        }
        onSpeechStart={
          cancelLiveSpeechClear
        }
        disabled={listening}
        onActiveChange={
          setClassroomAudioActive
        }
        onAudioStreamChange={
          (stream) => {
            classroomAudioStreamRef.current =
              stream;

            setExternalRecordingStream(
              stream
            ).catch((error) => {
              console.error(
                "Classroom recording source error:",
                error
              );
            });
          }
        }
      />

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
                onError={
                  handleDetectedFslVideoError
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

        <DhhResponseAssistant
          onClassroomStateChange={
            handleClassroomStateChange
          }
        />

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

/*
  Keep common HearMe/domain acronyms intact during machine translation.
  Translation providers sometimes treat an acronym such as GAD as an
  ordinary word and return a different word (for example, GOD). Replacing
  recognized acronyms with temporary tokens prevents that specific class
  of translation error while leaving the surrounding sentence available
  to the translation provider for context.
*/
const HEARME_PROTECTED_ACRONYM_PATTERN =
  /\b(?:GAD|FSL|DHH|ICT|DOH|PWD|LGBTQIA?|COVID-19|TESDA|CHED|DSWD|LGUs?|NGOs?|UNESCO|WHO|NASA|API|URL|SMS|OTP|PDF|UI|UX|USB|AI)\b/g;

function protectHearMeAcronyms(text) {
  const acronyms = [];
  const protectedText = String(text || "").replace(
    HEARME_PROTECTED_ACRONYM_PATTERN,
    (acronym) => {
      const token = `ZXQHEARMEACRONYM${acronyms.length}QXZ`;
      acronyms.push({ token, acronym });
      return token;
    }
  );

  return { protectedText, acronyms };
}

function restoreHearMeAcronyms(text, acronyms) {
  let restoredText = String(text || "");

  acronyms.forEach(({ token, acronym }) => {
    // Providers may change placeholder casing, so restore case-insensitively.
    restoredText = restoredText.replace(
      new RegExp(token, "gi"),
      acronym
    );
  });

  return restoredText;
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

  const { protectedText, acronyms } =
    protectHearMeAcronyms(text);

  const restore = (result) =>
    restoreHearMeAcronyms(result, acronyms);

  try {
    const googleResult =
      await translateWithGoogleCloud(
        protectedText,
        source,
        target
      );

    if (googleResult) {
      console.log(
        `Translation provider: Google Cloud Translation (${source} → ${target})`
      );
      return restore(googleResult);
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
        protectedText,
        source,
        target
      );

    if (memoryResult) {
      console.log(
        `Translation provider: MyMemory (${source} → ${target})`
      );
      return restore(memoryResult);
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
function findAllFslMatches(
  text
) {
  if (!text?.trim()) {
    return [];
  }

  const normalizedText =
    normalizeText(text);

  const candidates = [];

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
            (index, occurrenceIndex) => {
              candidates.push({
                phrase: phraseItem,
                index,
                endIndex:
                  index +
                  normalizedKeyword.length,
                keywordLength:
                  normalizedKeyword.length,
                normalizedKeyword,
                occurrenceIndex,
              });
            }
          );
        }
      );
    }
  );

  candidates.sort(
    (first, second) => {
      if (first.index !== second.index) {
        return first.index - second.index;
      }

      return (
        second.keywordLength -
        first.keywordLength
      );
    }
  );

  // Prefer the longest phrase at an overlapping location. For example,
  // "thank you very much" should win over the shorter "thank you" match.
  const accepted = [];

  candidates.forEach((candidate) => {
    const overlaps = accepted.some(
      (existing) =>
        candidate.index < existing.endIndex &&
        candidate.endIndex > existing.index
    );

    if (!overlaps) {
      accepted.push(candidate);
    }
  });

  return accepted;
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