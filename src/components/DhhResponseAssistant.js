import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaEraser,
  FaPlay,
  FaSignLanguage,
  FaStop,
} from "react-icons/fa";

import { fslPhrases } from "./fslPhrases";
import "./DhhResponseAssistant.css";

/*
  DHH RESPONSE ASSISTANT

  This component is intentionally separate from
  the live speech-captioning FSL state.

  It only reads the existing FSL phrase catalog,
  detects supported phrase occurrences in typed
  text, and plays the corresponding pre-recorded
  FSL resources when available.
*/
export default function DhhResponseAssistant() {
  const [responseText, setResponseText] =
    useState("");

  const [detectedMatches, setDetectedMatches] =
    useState([]);

  const [activeIndex, setActiveIndex] =
    useState(null);

  const [playAllActive, setPlayAllActive] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  const videoRef = useRef(null);

  const activeMatch = useMemo(() => {
    if (
      activeIndex === null ||
      !detectedMatches[activeIndex]
    ) {
      return null;
    }

    return detectedMatches[activeIndex];
  }, [
    activeIndex,
    detectedMatches,
  ]);

  const playableIndexes = useMemo(() => {
    return detectedMatches
      .map((item, index) =>
        item?.phrase?.video
          ? index
          : null
      )
      .filter(
        (index) => index !== null
      );
  }, [detectedMatches]);

  useEffect(() => {
    if (
      !activeMatch?.phrase?.video ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    video.muted = true;
    video.currentTime = 0;
    video.load();

    const playRequest = video.play();

    if (
      playRequest !== undefined
    ) {
      playRequest.catch(() => {
        setStatusMessage(
          "Press Play if the browser blocks automatic playback."
        );
      });
    }

    return () => {
      video.pause();
    };
  }, [activeMatch]);

  const handleDetect = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    const matches = findAllFslMatches(
      responseText
    );

    setDetectedMatches(matches);
    setActiveIndex(null);
    setPlayAllActive(false);
    setStatusMessage("");

    if (!responseText.trim()) {
      setStatusMessage(
        "Type a response first."
      );
      return;
    }

    if (matches.length === 0) {
      setStatusMessage(
        "No supported FSL phrase was detected in this response."
      );
      return;
    }

    const unavailableCount =
      matches.filter(
        (item) =>
          !item?.phrase?.video
      ).length;

    if (unavailableCount > 0) {
      setStatusMessage(
        `${matches.length} supported phrase${
          matches.length === 1 ? "" : "s"
        } detected. ${unavailableCount} clip${
          unavailableCount === 1 ? " is" : "s are"
        } currently unavailable.`
      );
    } else {
      setStatusMessage(
        `${matches.length} supported FSL phrase${
          matches.length === 1 ? "" : "s"
        } detected.`
      );
    }
  };

  const handlePlay = (index) => {
    const item = detectedMatches[index];

    if (!item) {
      return;
    }

    setPlayAllActive(false);
    setStatusMessage("");

    if (
      activeIndex === index &&
      item?.phrase?.video &&
      videoRef.current
    ) {
      const video = videoRef.current;

      video.pause();
      video.currentTime = 0;

      const playRequest = video.play();

      if (
        playRequest !== undefined
      ) {
        playRequest.catch(() => {
          setStatusMessage(
            "Press Play if the browser blocks automatic playback."
          );
        });
      }

      return;
    }

    setActiveIndex(index);
  };

  const handlePlayAll = () => {
    if (playableIndexes.length === 0) {
      setPlayAllActive(false);
      setActiveIndex(null);
      setStatusMessage(
        "No FSL video is currently available for the detected phrases."
      );
      return;
    }

    setPlayAllActive(true);
    setStatusMessage("");
    setActiveIndex(playableIndexes[0]);
  };

  const handleStop = () => {
    setPlayAllActive(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setActiveIndex(null);
    setStatusMessage("");
  };

  const handleVideoEnded = () => {
    if (!playAllActive) {
      /*
        Individual playback:

        Hide the video player after the clip finishes.
        The detected phrase remains visible so the user
        can replay it whenever needed.
      */
      setActiveIndex(null);
      return;
    }

    const currentPosition =
      playableIndexes.indexOf(
        activeIndex
      );

    const nextIndex =
      playableIndexes[
        currentPosition + 1
      ];

    if (nextIndex === undefined) {
      /*
        Play All sequence has finished.

        Hide the final video while keeping the
        detected phrase list visible.
      */
      setPlayAllActive(false);
      setActiveIndex(null);
      return;
    }

    setActiveIndex(nextIndex);
  };

  const handleClear = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setResponseText("");
    setDetectedMatches([]);
    setActiveIndex(null);
    setPlayAllActive(false);
    setStatusMessage("");
  };

  return (
    <section className="dhh-response-assistant">
      <div className="dhh-response-header">
        <div>
          <h2 className="dhh-response-title">
            <FaSignLanguage />
            DHH Response Assistant
          </h2>

          <p className="dhh-response-description">
            Type your response below. HearMe will
            identify supported phrases and provide
            corresponding FSL visual clips.
          </p>
        </div>
      </div>

      <div className="dhh-response-notice">
        <strong>
          Supported phrases only.
        </strong>{" "}
        Only phrases available in the HearMe FSL
        Phrase Bank can be detected and played.
      </div>

      <label
        className="dhh-response-label"
        htmlFor="dhh-response-text"
      >
        Your response
      </label>

      <textarea
        id="dhh-response-text"
        className="dhh-response-textarea"
        value={responseText}
        onChange={(event) =>
          setResponseText(
            event.target.value
          )
        }
        placeholder="Type your response here..."
        rows={4}
      />

      <div className="dhh-response-actions">
        <button
          type="button"
          className="dhh-response-button primary"
          onClick={handleDetect}
        >
          <FaSignLanguage />
          Detect FSL Phrases
        </button>

        <button
          type="button"
          className="dhh-response-button secondary"
          onClick={handlePlayAll}
          disabled={
            playableIndexes.length === 0
          }
        >
          <FaPlay />
          Play All FSL
        </button>

        <button
          type="button"
          className="dhh-response-button secondary"
          onClick={handleStop}
          disabled={activeIndex === null}
        >
          <FaStop />
          Stop
        </button>

        <button
          type="button"
          className="dhh-response-button clear"
          onClick={handleClear}
          disabled={
            !responseText &&
            detectedMatches.length === 0
          }
        >
          <FaEraser />
          Clear Response
        </button>
      </div>

      {statusMessage && (
        <div
          className="dhh-response-status"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      {detectedMatches.length > 0 && (
        <div className="dhh-response-results">
          <div className="dhh-response-results-header">
            <h3>
              Detected FSL Phrases
            </h3>

            <span>
              {detectedMatches.length} detected
            </span>
          </div>

          <div className="dhh-response-results-list">
            {detectedMatches.map(
              (item, index) => {
                const hasVideo = Boolean(
                  item?.phrase?.video
                );

                const isActive =
                  activeIndex === index;

                return (
                  <div
                    className={
                      isActive
                        ? "dhh-response-result active"
                        : "dhh-response-result"
                    }
                    key={item.key}
                  >
                    <div className="dhh-response-result-info">
                      <span className="dhh-response-result-number">
                        {index + 1}
                      </span>

                      <div>
                        <strong>
                          {item.phrase.phrase}
                        </strong>

                        <span>
                          {item.phrase.filipino}
                        </span>
                      </div>
                    </div>

                    {hasVideo ? (
                      <button
                        type="button"
                        className="dhh-response-play-button"
                        onClick={() =>
                          handlePlay(index)
                        }
                      >
                        <FaPlay />

                        {isActive &&
                        !playAllActive
                          ? "Replay FSL"
                          : "Play FSL"}
                      </button>
                    ) : (
                      <span className="dhh-response-unavailable">
                        FSL video coming soon
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {activeMatch && (
            <div className="dhh-response-player">
              <div className="dhh-response-player-header">
                <div>
                  <span>
                    FSL Visual Support
                  </span>

                  <strong>
                    {activeMatch.phrase.phrase}
                  </strong>
                </div>

                {playAllActive && (
                  <span className="dhh-response-playing-badge">
                    Playing sequence
                  </span>
                )}
              </div>

              {activeMatch.phrase.video ? (
                <video
                  ref={videoRef}
                  className="dhh-response-video"
                  src={activeMatch.phrase.video}
                  muted
                  playsInline
                  preload="auto"
                  controls
                  onEnded={
                    handleVideoEnded
                  }
                  onError={() =>
                    setStatusMessage(
                      "FSL video currently unavailable."
                    )
                  }
                >
                  Your browser does not support
                  video playback.
                </video>
              ) : (
                <div className="dhh-response-player-unavailable">
                  FSL video currently unavailable.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function findAllFslMatches(text) {
  const normalizedText = normalizeText(
    text
  );

  if (!normalizedText) {
    return [];
  }

  const candidates = [];

  fslPhrases.forEach((phraseItem) => {
    const keywords =
      phraseItem.keywords?.length
        ? phraseItem.keywords
        : [
            phraseItem.phrase,
            phraseItem.filipino,
          ];

    keywords.forEach((keyword) => {
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

      positions.forEach((index) => {
        candidates.push({
          phrase: phraseItem,
          index,
          end:
            index +
            normalizedKeyword.length,
          keywordLength:
            normalizedKeyword.length,
        });
      });
    });
  });

  const uniqueCandidates = new Map();

  candidates.forEach((candidate) => {
    const key =
      `${candidate.phrase.id}-${candidate.index}`;

    const existing =
      uniqueCandidates.get(key);

    if (
      !existing ||
      candidate.keywordLength >
        existing.keywordLength
    ) {
      uniqueCandidates.set(
        key,
        candidate
      );
    }
  });

  const sortedCandidates = [
    ...uniqueCandidates.values(),
  ].sort((first, second) => {
    if (
      first.index !== second.index
    ) {
      return first.index - second.index;
    }

    if (
      first.keywordLength !==
      second.keywordLength
    ) {
      return (
        second.keywordLength -
        first.keywordLength
      );
    }

    return (
      second.phrase.phrase.length -
      first.phrase.phrase.length
    );
  });

  const selectedCandidates = [];

  sortedCandidates.forEach(
    (candidate) => {
      const overlaps =
        selectedCandidates.some(
          (selected) =>
            candidate.index <
              selected.end &&
            candidate.end >
              selected.index
        );

      if (!overlaps) {
        selectedCandidates.push(
          candidate
        );
      }
    }
  );

  return selectedCandidates.map(
    (candidate, occurrenceIndex) => ({
      key:
        `${candidate.phrase.id}-${candidate.index}-${occurrenceIndex}`,
      phrase: candidate.phrase,
      index: candidate.index,
    })
  );
}

function normalizeText(text) {
  return String(text || "")
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
    (match = regex.exec(text)) !== null
  ) {
    const leadingSpace =
      match[1]?.length || 0;

    positions.push(
      match.index + leadingSpace
    );

    if (
      regex.lastIndex === match.index
    ) {
      regex.lastIndex++;
    }
  }

  return positions;
}