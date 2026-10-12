import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaDesktop,
  FaExclamationTriangle,
  FaMicrophone,
  FaStop,
} from "react-icons/fa";

import "./ClassroomAudioAdapter.css";

/*
  CLASSROOM AUDIO INPUT ADAPTER

  This component captures audio from a user-selected
  browser tab, window, or screen using getDisplayMedia().

  The captured audio track is passed directly to the
  browser SpeechRecognition API. Final transcript text
  is returned to CaptioningPanel through onFinalTranscript,
  so the existing caption -> translation -> FSL pipeline
  remains the single downstream processing path.

  This adapter does NOT record audio, write Firebase data,
  translate text, or perform FSL matching.
*/
export default function ClassroomAudioAdapter({
  speechRecognitionLanguage,
  onFinalTranscript,
  onInterimTranscript,
  disabled = false,
  onActiveChange,
  onAudioStreamChange,
  onSpeechStart,
  onSpeechEnd,
}) {
  const [status, setStatus] =
    useState("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [audioSourceLabel, setAudioSourceLabel] =
    useState("");

  const streamRef = useRef(null);
  const audioTrackRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldBeActiveRef = useRef(false);
  const finalizedResultKeysRef = useRef(
    new Set()
  );

  /*
    Browser speech recognition may keep the latest classroom utterance as
    an interim result instead of emitting a final result before speech
    ends. Keep that latest interim text so it can be promoted to the
    shared finalized-transcript ingestion boundary when the utterance
    ends.
  */
  const pendingInterimTranscriptRef =
    useRef("");

  const onFinalTranscriptRef =
    useRef(onFinalTranscript);
  const onInterimTranscriptRef =
    useRef(onInterimTranscript);
  const onAudioStreamChangeRef =
    useRef(onAudioStreamChange);
  const onSpeechStartRef =
    useRef(onSpeechStart);
  const onSpeechEndRef =
    useRef(onSpeechEnd);

  useEffect(() => {
    onFinalTranscriptRef.current =
      onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onInterimTranscriptRef.current =
      onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    onAudioStreamChangeRef.current =
      onAudioStreamChange;
  }, [onAudioStreamChange]);

  useEffect(() => {
    onSpeechStartRef.current =
      onSpeechStart;
  }, [onSpeechStart]);

  useEffect(() => {
    onSpeechEndRef.current =
      onSpeechEnd;
  }, [onSpeechEnd]);

  useEffect(() => {
    onActiveChange?.(
      status === "requesting" ||
        status === "connected"
    );
  }, [status, onActiveChange]);

  useEffect(() => {
    return () => {
      shouldBeActiveRef.current = false;
      cleanupCapture();
    };
  }, []);

  const flushPendingInterimTranscript =
    useCallback((options = {}) => {
      const pendingText =
        String(
          pendingInterimTranscriptRef.current ||
            ""
        )
          .trim()
          .replace(/\s+/g, " ");

      if (!pendingText) {
        return false;
      }

      pendingInterimTranscriptRef.current =
        "";

      onFinalTranscriptRef.current?.(
        pendingText,
        options
      );

      return true;
    }, []);

  const cleanupCapture = () => {
    const recognition =
      recognitionRef.current;

    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onsoundend = null;
      recognitionRef.current = null;

      try {
        recognition.stop();
      } catch (error) {
        // Recognition may already be inactive.
      }
    }

    if (audioTrackRef.current) {
      audioTrackRef.current.onended = null;
    }

    if (streamRef.current) {
      const videoTrack =
        streamRef.current.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = null;
      }
      streamRef.current
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch (error) {
            // Track may already be stopped.
          }
        });

      streamRef.current = null;
    }

    audioTrackRef.current = null;
    finalizedResultKeysRef.current =
      new Set();

    pendingInterimTranscriptRef.current =
      "";

    onInterimTranscriptRef.current?.("");
  };

  const stopClassroomAudio = () => {
    /*
      Manual stop is a hard live-display boundary. The last classroom
      utterance still needs to be committed to the permanent transcript,
      but it must NOT be shown again in the live caption area after the
      source is stopped.

      CaptioningPanel receives showLiveDisplay=false for this final commit,
      so History and translation keep the text without restoring the stale
      live caption.
    */
    flushPendingInterimTranscript({
      showLiveDisplay: false,
    });

    shouldBeActiveRef.current = false;

    onSpeechEndRef.current?.();
    onAudioStreamChangeRef.current?.(null);
    cleanupCapture();

    setStatus("idle");
    setErrorMessage("");
    setAudioSourceLabel("");
  };

  const handleTrackEnded = () => {
    if (!shouldBeActiveRef.current) {
      return;
    }

    /*
      Flush the last classroom utterance before the shared track is
      released.
    */
    flushPendingInterimTranscript();

    shouldBeActiveRef.current = false;
    onSpeechEndRef.current?.();
    onAudioStreamChangeRef.current?.(null);
    cleanupCapture();

    setStatus("idle");
    setAudioSourceLabel("");
    setErrorMessage(
      "Classroom audio sharing ended. Start it again when you are ready."
    );
  };

  const startClassroomAudio = async () => {
    if (disabled) {
      setErrorMessage(
        "Stop direct microphone listening before starting classroom audio."
      );
      setStatus("error");
      return;
    }

    if (status === "requesting" || status === "connected") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("error");
      setErrorMessage(
        "This browser does not support the Web Speech API required for classroom audio."
      );
      return;
    }

    if (
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      setStatus("error");
      setErrorMessage(
        "This browser does not support browser audio sharing."
      );
      return;
    }

    if (!supportsClassroomAudioRecognition()) {
      setStatus("error");
      setErrorMessage(
        "Classroom audio input currently requires Chrome, Edge, or Opera 135+ on desktop. The direct microphone mode remains available."
      );
      return;
    }

    shouldBeActiveRef.current = true;
    finalizedResultKeysRef.current =
      new Set();

    setStatus("requesting");
    setErrorMessage("");
    setAudioSourceLabel("");

    try {
      /*
        getDisplayMedia() requires video=true even when
        the classroom feature only needs the selected
        source's audio track. The video track is not
        displayed or used by HearMe.
      */
      const stream =
        await navigator.mediaDevices.getDisplayMedia(
          {
            video: true,
            audio: true,
            preferCurrentTab: false,
            selfBrowserSurface: "exclude",
            systemAudio: "include",
            surfaceSwitching: "include",
          }
        );

      if (!shouldBeActiveRef.current) {
        stream
          .getTracks()
          .forEach((track) => track.stop());
        return;
      }

      const audioTracks =
        stream.getAudioTracks();

      if (audioTracks.length === 0) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        shouldBeActiveRef.current = false;
        onAudioStreamChangeRef.current?.(null);
        setStatus("error");
        setErrorMessage(
          "No audio track was shared. In the browser sharing dialog, select a tab/window with audio and enable audio sharing."
        );
        return;
      }

      const audioTrack =
        audioTracks[0];

      if (
        audioTrack.kind !== "audio" ||
        audioTrack.readyState !== "live"
      ) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        shouldBeActiveRef.current = false;
        onAudioStreamChangeRef.current?.(null);
        setStatus("error");
        setErrorMessage(
          "The shared audio track is not available for speech recognition."
        );
        return;
      }

      streamRef.current = stream;
      audioTrackRef.current =
        audioTrack;

      // Expose an audio-only stream to the recording layer.
      // RecordingContext clones its track so the recorder owns its
      // lifecycle without interfering with speech recognition.
      const recordingAudioStream =
        new MediaStream([audioTrack]);

      onAudioStreamChangeRef.current?.(
        recordingAudioStream
      );

      audioTrack.onended =
        handleTrackEnded;

      const videoTrack =
        stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended =
          handleTrackEnded;
      }

      const settings =
        typeof audioTrack.getSettings ===
        "function"
          ? audioTrack.getSettings()
          : {};

      setAudioSourceLabel(
        settings.displaySurface
          ? `Shared ${settings.displaySurface} audio`
          : "Shared browser audio"
      );

      const recognition =
        new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        speechRecognitionLanguage ||
        "en-US";

      recognition.onstart = () => {
        if (!shouldBeActiveRef.current) {
          return;
        }

        setStatus("connected");
        setErrorMessage("");
      };

      recognition.onspeechstart = () => {
        if (!shouldBeActiveRef.current) {
          return;
        }

        onSpeechStartRef.current?.();
      };

      recognition.onspeechend = () => {
        if (!shouldBeActiveRef.current) {
          return;
        }

        flushPendingInterimTranscript();
        onSpeechEndRef.current?.();
      };

      recognition.onsoundend = () => {
        if (!shouldBeActiveRef.current) {
          return;
        }

        flushPendingInterimTranscript();
        onSpeechEndRef.current?.();
      };

      recognition.onresult = (event) => {
        if (!shouldBeActiveRef.current) {
          return;
        }

        let interimText = "";
        const finalSegments = [];

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const result =
            event.results[i];

          const transcript =
            result?.[0]?.transcript
              ?.trim() || "";

          if (!transcript) {
            continue;
          }

          if (result.isFinal) {
            const resultKey =
              `${i}:${transcript}`;

            if (
              finalizedResultKeysRef.current.has(
                resultKey
              )
            ) {
              continue;
            }

            finalizedResultKeysRef.current.add(
              resultKey
            );

            finalSegments.push(
              transcript
            );
          } else {
            interimText +=
              `${transcript} `;
          }
        }

        const cleanInterimText =
          interimText
            .trim()
            .replace(/\s+/g, " ");

        pendingInterimTranscriptRef.current =
          cleanInterimText;

        onInterimTranscriptRef.current?.(
          cleanInterimText
        );

        if (finalSegments.length > 0) {
          onFinalTranscriptRef.current?.(
            finalSegments.join(" ")
          );

          /*
            If no newer interim text is active, the final result has
            already been committed and there is nothing left to flush.
          */
          if (!cleanInterimText) {
            pendingInterimTranscriptRef.current =
              "";
          }
        }
      };

      recognition.onerror = (event) => {
        console.error(
          "Classroom speech recognition error:",
          event.error
        );

        if (
          event.error === "aborted"
        ) {
          return;
        }

        if (
          event.error === "not-allowed" ||
          event.error ===
            "service-not-allowed"
        ) {
          shouldBeActiveRef.current =
            false;
          onAudioStreamChangeRef.current?.(null);
          cleanupCapture();
          setStatus("error");
          setErrorMessage(
            "Classroom speech recognition permission was denied or is unavailable."
          );
          return;
        }

        setErrorMessage(
          `Classroom speech recognition error: ${event.error}`
        );
      };

      recognition.onend = () => {
        if (
          !shouldBeActiveRef.current
        ) {
          return;
        }

        const currentTrack =
          audioTrackRef.current;

        if (
          !currentTrack ||
          currentTrack.readyState !==
            "live"
        ) {
          handleTrackEnded();
          return;
        }

        try {
          recognition.start(
            currentTrack
          );
        } catch (error) {
          console.warn(
            "Classroom speech recognition restart error:",
            error
          );
        }
      };

      recognitionRef.current =
        recognition;

      /*
        Critical safety rule:
        pass the selected audio track explicitly.
        We never call recognition.start() without
        an audio track in classroom mode, because that
        would fall back to microphone input.
      */
      recognition.start(
        audioTrack
      );
    } catch (error) {
      console.error(
        "Classroom audio capture error:",
        error
      );

      shouldBeActiveRef.current =
        false;
      onAudioStreamChangeRef.current?.(null);
      cleanupCapture();

      if (
        error?.name === "NotAllowedError" ||
        error?.name === "AbortError"
      ) {
        setStatus("idle");
        setErrorMessage(
          "Classroom audio sharing was cancelled. No microphone or classroom audio was started."
        );
        return;
      }

      setStatus("error");
      setErrorMessage(
        "Unable to start classroom audio capture. Please try again in a supported desktop browser."
      );
    }
  };

  const isActive =
    status === "requesting" ||
    status === "connected";

  return (
    <section className="classroom-audio-card">
      <div className="classroom-audio-header">
        <div className="classroom-audio-title-wrap">
          <div className="classroom-audio-icon">
            <FaDesktop />
          </div>

          <div>
            <h3>
              Classroom Audio Input
            </h3>

            <p>
              Capture audio from another browser
              tab or window without replacing the
              existing microphone mode.
            </p>
          </div>
        </div>

        <span
          className={`classroom-audio-status ${status}`}
        >
          {status === "connected"
            ? "Connected"
            : status === "requesting"
            ? "Waiting for source"
            : status === "error"
            ? "Needs attention"
            : "Ready"}
        </span>
      </div>

      <div className="classroom-audio-instructions">
        <strong>
          How it works:
        </strong>
        <span>
          Click Start, choose the classroom/meeting
          tab or window, then enable its audio sharing
          option in the browser dialog.
        </span>
      </div>

      <div className="classroom-audio-actions">
        {!isActive ? (
          <button
            type="button"
            className="classroom-audio-button start"
            onClick={startClassroomAudio}
            disabled={disabled}
          >
            <FaMicrophone />
            Start Classroom Audio
          </button>
        ) : (
          <button
            type="button"
            className="classroom-audio-button stop"
            onClick={stopClassroomAudio}
          >
            <FaStop />
            Stop Classroom Audio
          </button>
        )}

        {audioSourceLabel && (
          <span className="classroom-audio-source">
            {audioSourceLabel}
          </span>
        )}
      </div>

      {disabled && !isActive && (
        <div className="classroom-audio-helper">
          Stop direct microphone listening before
          starting classroom audio.
        </div>
      )}

      {errorMessage && (
        <div
          className="classroom-audio-error"
          role="status"
          aria-live="polite"
        >
          <FaExclamationTriangle />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}

function supportsClassroomAudioRecognition() {
  const userAgent =
    navigator.userAgent || "";

  const userAgentData =
    navigator.userAgentData;

  if (userAgentData?.mobile) {
    return false;
  }

  const brandEntries =
    Array.isArray(userAgentData?.brands)
      ? userAgentData.brands
      : [];

  const matchingBrand =
    brandEntries.find((brand) =>
      /Chrome|Chromium|Microsoft Edge|Opera/i.test(
        brand?.brand || ""
      )
    );

  const match = matchingBrand
    ? String(matchingBrand.version || "")
    : userAgent.match(
        /(?:Chrome|Chromium|Edg|OPR)\/(\d+)/i
      )?.[1] || "";

  const version = Number(match);

  return (
    Number.isFinite(version) &&
    version >= 135 &&
    /Chrome|Chromium|Edg|OPR/i.test(
      userAgent +
        " " +
        (matchingBrand?.brand || "")
    )
  );
}
