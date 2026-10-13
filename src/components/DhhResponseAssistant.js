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

import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

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

  /*
    CLASSROOM RESPONSE SHARING

    The typed DHH response is shared through a small Firestore
    classroom room. This is separate from academic-session History
    so live responses can be seen before the session is saved.
  */
  const [roomCodeInput, setRoomCodeInput] =
    useState("");

  const [joinedRoomCode, setJoinedRoomCode] =
    useState("");

  const [sharedResponses, setSharedResponses] =
    useState([]);

  const [roomLoading, setRoomLoading] =
    useState(false);

  const [shareStatus, setShareStatus] =
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

  /*
    Subscribe to the current classroom room. Every participant who
    joins the same room code receives the same live response feed.
  */
  useEffect(() => {
    setSharedResponses([]);

    if (!joinedRoomCode) {
      return undefined;
    }

    const responsesRef = collection(
      db,
      "classroomRooms",
      joinedRoomCode,
      "responses"
    );

    const responsesQuery = query(
      responsesRef,
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        setSharedResponses(
          snapshot.docs.map((responseDoc) => ({
            id: responseDoc.id,
            ...responseDoc.data(),
          }))
        );
      },
      (error) => {
        console.error(
          "Classroom response listener error:",
          error
        );

        setShareStatus(
          "Unable to load live classroom responses."
        );
      }
    );

    return () => unsubscribe();
  }, [joinedRoomCode]);

  const handleCreateRoom = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setShareStatus(
        "Login is required to create a classroom response room."
      );
      return;
    }

    setRoomLoading(true);
    setShareStatus("");

    try {
      let selectedCode = "";
      let selectedSnapshot = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = generateRoomCode();
        const roomRef = doc(
          db,
          "classroomRooms",
          candidate
        );

        const roomSnapshot = await getDoc(roomRef);

        if (!roomSnapshot.exists()) {
          selectedCode = candidate;
          selectedSnapshot = roomRef;
          break;
        }
      }

      if (!selectedCode || !selectedSnapshot) {
        throw new Error(
          "Could not generate a unique classroom room code."
        );
      }

      await setDoc(selectedSnapshot, {
        roomCode: selectedCode,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        active: true,
      });

      setJoinedRoomCode(selectedCode);
      setRoomCodeInput(selectedCode);
      setShareStatus(
        `Classroom room created: ${selectedCode}`
      );
    } catch (error) {
      console.error(
        "Create classroom room failed:",
        error
      );

      setShareStatus(
        "Unable to create the classroom response room."
      );
    } finally {
      setRoomLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setShareStatus(
        "Login is required to join a classroom response room."
      );
      return;
    }

    const normalizedCode = roomCodeInput
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      setShareStatus(
        "Enter a classroom room code first."
      );
      return;
    }

    setRoomLoading(true);
    setShareStatus("");

    try {
      const roomSnapshot = await getDoc(
        doc(
          db,
          "classroomRooms",
          normalizedCode
        )
      );

      if (!roomSnapshot.exists()) {
        setShareStatus(
          "Classroom room not found. Check the room code."
        );
        return;
      }

      if (roomSnapshot.data()?.active !== true) {
        setShareStatus(
          "This classroom room is no longer active."
        );
        return;
      }

      setJoinedRoomCode(normalizedCode);
      setRoomCodeInput(normalizedCode);
      setShareStatus(
        `Joined classroom room: ${normalizedCode}`
      );
    } catch (error) {
      console.error(
        "Join classroom room failed:",
        error
      );

      setShareStatus(
        "Unable to join the classroom response room."
      );
    } finally {
      setRoomLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoomCode("");
    setSharedResponses([]);
    setShareStatus("Left classroom response room.");
  };

  const handleCopyRoomCode = async () => {
    if (!joinedRoomCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        joinedRoomCode
      );

      setShareStatus(
        `Room code ${joinedRoomCode} copied.`
      );
    } catch (error) {
      console.warn(
        "Room code copy failed:",
        error
      );

      setShareStatus(
        `Room code: ${joinedRoomCode}`
      );
    }
  };

  const handleSendResponse = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setShareStatus(
        "Login is required to share a classroom response."
      );
      return;
    }

    if (!joinedRoomCode) {
      setShareStatus(
        "Create or join a classroom response room first."
      );
      return;
    }

    const trimmedResponse = responseText
      .trim();

    if (!trimmedResponse) {
      setShareStatus(
        "Type a response before sending it to the classroom."
      );
      return;
    }

    if (trimmedResponse.length > 500) {
      setShareStatus(
        "Classroom responses are limited to 500 characters."
      );
      return;
    }

    setRoomLoading(true);
    setShareStatus("");

    try {
      await addDoc(
        collection(
          db,
          "classroomRooms",
          joinedRoomCode,
          "responses"
        ),
        {
          userId: currentUser.uid,
          displayName:
            currentUser.displayName ||
            currentUser.email ||
            "Classroom participant",
          text: trimmedResponse,
          createdAt: serverTimestamp(),
        }
      );

      setResponseText("");
      setShareStatus(
        "Response shared with the classroom."
      );
    } catch (error) {
      console.error(
        "Send classroom response failed:",
        error
      );

      setShareStatus(
        "Unable to share the response. Please try again."
      );
    } finally {
      setRoomLoading(false);
    }
  };

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

      <div className="dhh-response-sharing">
        <div className="dhh-response-sharing-header">
          <div>
            <h3>Classroom Response Sharing</h3>
            <p>
              Create or join a room so the teacher and classmates can see typed responses in real time.
            </p>
          </div>

          {joinedRoomCode && (
            <span className="dhh-response-room-badge">
              ROOM {joinedRoomCode}
            </span>
          )}
        </div>

        {!joinedRoomCode ? (
          <>
            <div className="dhh-response-room-actions">
              <button
                type="button"
                className="dhh-response-button room-primary"
                onClick={handleCreateRoom}
                disabled={roomLoading}
              >
                {roomLoading ? "Creating..." : "Create Classroom Room"}
              </button>

              <div className="dhh-response-room-join">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(event) =>
                    setRoomCodeInput(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="ROOM CODE"
                  maxLength={6}
                  aria-label="Classroom room code"
                />

                <button
                  type="button"
                  className="dhh-response-button secondary"
                  onClick={handleJoinRoom}
                  disabled={roomLoading}
                >
                  Join Room
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="dhh-response-room-connected">
            <div className="dhh-response-room-code-line">
              <span>
                Share this room code with the teacher/classmates:
              </span>
              <strong>{joinedRoomCode}</strong>
            </div>

            <div className="dhh-response-room-buttons">
              <button
                type="button"
                className="dhh-response-button secondary"
                onClick={handleCopyRoomCode}
              >
                Copy Code
              </button>

              <button
                type="button"
                className="dhh-response-button clear"
                onClick={handleLeaveRoom}
                disabled={roomLoading}
              >
                Leave Room
              </button>
            </div>
          </div>
        )}

        {shareStatus && (
          <div
            className="dhh-response-share-status"
            aria-live="polite"
          >
            {shareStatus}
          </div>
        )}
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
          className="dhh-response-button room-primary"
          onClick={handleSendResponse}
          disabled={
            !joinedRoomCode ||
            roomLoading ||
            !responseText.trim()
          }
        >
          Share Response
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

      {joinedRoomCode && (
        <div className="dhh-response-shared-feed">
          <div className="dhh-response-shared-feed-header">
            <div>
              <h3>Live Classroom Responses</h3>
              <p>
                Responses shared in room {joinedRoomCode}.
              </p>
            </div>

            <span>
              {sharedResponses.length} response{
                sharedResponses.length === 1 ? "" : "s"
              }
            </span>
          </div>

          {sharedResponses.length > 0 ? (
            <div className="dhh-response-shared-feed-list">
              {sharedResponses.map((item) => (
                <article
                  className="dhh-response-shared-item"
                  key={item.id}
                >
                  <div className="dhh-response-shared-item-meta">
                    <strong>
                      {item.userId === auth.currentUser?.uid
                        ? "You"
                        : item.displayName || "Classroom participant"}
                    </strong>

                    <span>
                      {formatResponseTime(item.createdAt)}
                    </span>
                  </div>

                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="dhh-response-shared-feed-empty">
              No classroom responses yet.
            </div>
          )}
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

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[
      Math.floor(Math.random() * alphabet.length)
    ];
  }

  return code;
}

function formatResponseTime(timestamp) {
  if (!timestamp) {
    return "Sending...";
  }

  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
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