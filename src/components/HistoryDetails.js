import React, { useEffect, useMemo, useRef, useState } from "react";

import "./HistoryDetails.css";

import { fslPhrases } from "./fslPhrases";





const normalizePhrase = (value) => {

  return String(value || "")

    .trim()

    .toLowerCase();

};





const formatDateValue = (date) => {

  if (!date) return "N/A";



  if (

    typeof date === "object" &&

    typeof date.toDate === "function"

  ) {

    const firestoreDate = date.toDate();



    if (!isNaN(firestoreDate)) {

      return firestoreDate.toLocaleDateString("en-US", {

        year: "numeric",

        month: "long",

        day: "numeric",

      });

    }

  }



  const formattedDate = new Date(date);



  if (isNaN(formattedDate)) {

    return String(date);

  }



  return formattedDate.toLocaleDateString("en-US", {

    year: "numeric",

    month: "long",

    day: "numeric",

  });

};





const formatDetectedTime = (date) => {

  if (!date) return null;



  if (

    typeof date === "object" &&

    typeof date.toDate === "function"

  ) {

    const firestoreDate = date.toDate();



    if (!isNaN(firestoreDate)) {

      return firestoreDate.toLocaleString("en-US", {

        year: "numeric",

        month: "short",

        day: "numeric",

        hour: "numeric",

        minute: "2-digit",

        second: "2-digit",

      });

    }

  }



  const formattedDate = new Date(date);



  if (isNaN(formattedDate)) {

    return String(date);

  }



  return formattedDate.toLocaleString("en-US", {

    year: "numeric",

    month: "short",

    day: "numeric",

    hour: "numeric",

    minute: "2-digit",

    second: "2-digit",

  });

};





const formatReplayOffset = (seconds) => {

  const value = Number(seconds);



  if (!Number.isFinite(value) || value < 0) {

    return null;

  }



  const totalSeconds = Math.floor(value);

  const minutes = Math.floor(totalSeconds / 60);

  const remainingSeconds = totalSeconds % 60;



  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

};





// Backward-compatible timing reader.

// Earlier synchronized sessions stored recordingOffsetMs, while the newer

// implementation stores recordingOffsetSeconds. Support both formats so

// previously saved History records keep working.

const getRecordingOffsetSeconds = (item) => {

  const seconds = Number(item?.recordingOffsetSeconds);



  if (Number.isFinite(seconds) && seconds >= 0) {

    return seconds;

  }



  const milliseconds = Number(item?.recordingOffsetMs);



  if (Number.isFinite(milliseconds) && milliseconds >= 0) {

    return milliseconds / 1000;

  }



  return null;

};





function HistoryDetails({

  session,

  setActivePage,

}) {

  const fslHistory = useMemo(

  () =>

    Array.isArray(

      session?.fslHistory

    )

      ? session.fslHistory

      : [],

  [session?.fslHistory]

);





  const replayItems = useMemo(() => {

    return fslHistory.map((item, index) => {

      const matchedPhrase = fslPhrases.find(

        (phraseItem) =>

          normalizePhrase(phraseItem.phrase) ===

          normalizePhrase(item?.phrase)

      );



      return {

        item,

        index,

        matchedPhrase,

      };

    });

  }, [fslHistory]);





  const synchronizedReplayItems = useMemo(() => {

    return replayItems.filter((entry) => {

      const offset = getRecordingOffsetSeconds(entry.item);



      return Number.isFinite(offset) && offset >= 0;

    });

  }, [replayItems]);

  // Legacy-session compatibility:
  // Older saved sessions may contain recordingUrl + fslHistory but no
  // recordingOffsetSeconds/recordingOffsetMs. Keep those sessions visible
  // instead of silently hiding the replay section. Only events with a real
  // recorded offset are used for automatic synchronization.
  const hasUnsynchronizedLegacyFslEvents = useMemo(() => {
    return (
      fslHistory.length > 0 &&
      synchronizedReplayItems.length < replayItems.length
    );
  }, [fslHistory.length, synchronizedReplayItems.length, replayItems.length]);





  const [selectedFslIndex, setSelectedFslIndex] = useState(0);

  const [sequentialPlaying, setSequentialPlaying] = useState(false);

  const [videoError, setVideoError] = useState(false);



  const videoRef = useRef(null);

  const audioRef = useRef(null);

  const syncVideoRef = useRef(null);

  const lastSyncTriggeredRef = useRef(-1);



  const [syncFslIndex, setSyncFslIndex] = useState(-1);

  const [syncFslPlaying, setSyncFslPlaying] = useState(false);





  useEffect(() => {

    setSelectedFslIndex(0);

    setSequentialPlaying(false);

    setVideoError(false);

    setSyncFslIndex(-1);

    setSyncFslPlaying(false);

    lastSyncTriggeredRef.current = -1;

  }, [session?.id]);





  useEffect(() => {

    setVideoError(false);

  }, [selectedFslIndex]);





  useEffect(() => {

    if (!sequentialPlaying) return;



    const selectedItem = replayItems[selectedFslIndex];



    if (!selectedItem?.matchedPhrase?.video) {

      setSequentialPlaying(false);

      return;

    }



    const video = videoRef.current;



    if (!video) return;



    const playPromise = video.play();



    if (

      playPromise &&

      typeof playPromise.catch === "function"

    ) {

      playPromise.catch(() => {

        setSequentialPlaying(false);

      });

    }

  }, [

    selectedFslIndex,

    sequentialPlaying,

    replayItems,

  ]);





  useEffect(() => {

    if (syncFslIndex < 0) return;



    const video = syncVideoRef.current;

    if (!video) return;



    video.currentTime = 0;

    const playPromise = video.play();



    if (playPromise && typeof playPromise.catch === "function") {

      playPromise.then(() => setSyncFslPlaying(true)).catch(() => setSyncFslPlaying(false));

    } else {

      setSyncFslPlaying(true);

    }

  }, [syncFslIndex]);





  const getLatestSyncedIndexAt = (currentTime) => {

    let latestIndex = -1;

    let latestOffset = -1;



    synchronizedReplayItems.forEach((entry) => {

      const offset = getRecordingOffsetSeconds(entry.item);

      if (Number.isFinite(offset) && offset <= currentTime && offset >= latestOffset) {

        latestOffset = offset;

        latestIndex = entry.index;

      }

    });



    return latestIndex;

  };





  const handleAudioTimeUpdate = () => {

    const audio = audioRef.current;

    if (!audio || synchronizedReplayItems.length === 0) return;



    const latestIndex = getLatestSyncedIndexAt(audio.currentTime);



    if (latestIndex === -1) {

      if (lastSyncTriggeredRef.current !== -1) {

        lastSyncTriggeredRef.current = -1;

        setSyncFslIndex(-1);

        setSyncFslPlaying(false);

      }

      return;

    }



    if (latestIndex !== lastSyncTriggeredRef.current) {

      lastSyncTriggeredRef.current = latestIndex;

      setSyncFslIndex(latestIndex);

    }

  };





  const handleAudioSeeked = () => {

    const audio = audioRef.current;

    if (!audio || synchronizedReplayItems.length === 0) return;



    lastSyncTriggeredRef.current = getLatestSyncedIndexAt(audio.currentTime);

    setSyncFslIndex(-1);

    setSyncFslPlaying(false);

  };





  const handleSyncVideoEnded = () => {

    setSyncFslPlaying(false);

    setSyncFslIndex(-1);

  };





  if (!session) {

    return (

      <div className="history-details-container">



        <h2>

          No Session Selected

        </h2>



        <button

          className="history-back-button"

          onClick={() =>

            setActivePage("history")

          }

        >

          ← Back to History

        </button>



      </div>

    );

  }





  const selectedReplayItem =

    replayItems[selectedFslIndex] || null;



  const selectedMatchedPhrase =

    selectedReplayItem?.matchedPhrase || null;



  const selectedHistoryItem =

    selectedReplayItem?.item || null;



  const selectedDetectedTime =

    formatDetectedTime(

      selectedHistoryItem?.detectedAt

    );





  const handleSelectFsl = (index) => {

    setSequentialPlaying(false);

    setSelectedFslIndex(index);

    setVideoError(false);

  };





  const handlePlayAll = () => {

    if (!replayItems.length) return;



    const firstAvailableIndex =

      replayItems.findIndex(

        (entry) =>

          entry.matchedPhrase?.video

      );



    if (firstAvailableIndex === -1) {

      setSelectedFslIndex(0);

      setSequentialPlaying(false);

      setVideoError(true);

      return;

    }



    setSelectedFslIndex(

      firstAvailableIndex

    );



    setVideoError(false);



    setSequentialPlaying(true);

  };





  const handleStopSequence = () => {

    setSequentialPlaying(false);



    if (videoRef.current) {

      videoRef.current.pause();

    }

  };





  const handleVideoEnded = () => {

    if (!sequentialPlaying) return;



    let nextIndex =

      selectedFslIndex + 1;



    while (

      nextIndex < replayItems.length &&

      !replayItems[nextIndex]

        ?.matchedPhrase?.video

    ) {

      nextIndex += 1;

    }



    if (

      nextIndex <

      replayItems.length

    ) {

      setSelectedFslIndex(

        nextIndex

      );



      return;

    }



    setSequentialPlaying(false);

  };





  const handleVideoError = () => {

    setVideoError(true);



    if (sequentialPlaying) {

      setSequentialPlaying(false);

    }

  };





  return (



    <div className="history-details-container">



      <h2>

        Session Details

      </h2>





      <button

        className="history-back-button"

        onClick={() =>

          setActivePage("history")

        }

      >

        ← Back to History

      </button>





      <section className="details-card">



        <h3>

          📚 Session Information

        </h3>





        <p>

          <strong>

            Subject

          </strong>



          <span>

            {session.subject || "N/A"}

          </span>

        </p>





        <p>

          <strong>

            Instructor

          </strong>



          <span>

            {session.instructor || "N/A"}

          </span>

        </p>





        <p>

          <strong>

            Date

          </strong>



          <span>

            {formatDateValue(

              session.sessionDate

            )}

          </span>

        </p>





        <p>

          <strong>

            Context

          </strong>



          <span>

            {session.context || "N/A"}

          </span>

        </p>



      </section>





      <section className="details-card">



        <h3>

          📝 Transcript

        </h3>



        <div className="content-box">

          {

            session.captions ||

            "No transcript available."

          }

        </div>



      </section>





      <section className="details-card">



        <h3>

          🌐 Translation

        </h3>



        <div className="content-box">

          {

            session.translated ||

            "No translation available."

          }

        </div>



      </section>





      <section className="details-card">



        <h3>

          🌍 Language

        </h3>



        <div className="content-box">



          {

            session.inputMode ||

            "N/A"

          }



          {" → "}



          {

            session.languageOutput ||

            "N/A"

          }



        </div>



      </section>





      {

        session.recordingUrl && (



          <section className="details-card">



            <h3>

              🎙️ Recording

            </h3>





            <audio

              ref={audioRef}

              controls

              onTimeUpdate={handleAudioTimeUpdate}

              onSeeked={handleAudioSeeked}

              onPause={() => {

                syncVideoRef.current?.pause();

              }}

              style={{

                width: "100%",

              }}

            >



              <source

                src={

                  session.recordingUrl

                }

                type="audio/webm"

              />



              Your browser does not

              support audio playback.



            </audio>



          </section>



        )

      }





      {

        session.recordingUrl &&

        fslHistory.length > 0 && (

          <section className="details-card synchronized-replay-card">

            <div className="synchronized-replay-heading">

              <div>

                <h3>🎬 Synchronized FSL Session Replay</h3>

                <p>

                  Play the saved audio recording. When a recorded FSL event is reached, the corresponding FSL clip plays automatically.

                </p>

              </div>

              <span className="synchronized-replay-badge">

                {synchronizedReplayItems.length} FSL event

                {synchronizedReplayItems.length === 1 ? "" : "s"}

              </span>

            </div>



            <div className="synchronized-replay-player">

              <div className="synchronized-replay-audio-label">🎙️ Session timeline</div>

              <p className="synchronized-replay-audio-note">

                The session recording player above is the synchronized timeline for this replay.

              </p>



              {syncFslIndex >= 0 && (() => {

                const entry = replayItems[syncFslIndex];

                const phrase = entry?.matchedPhrase;

                const offset = getRecordingOffsetSeconds(entry?.item);



                if (!phrase?.video) {

                  return (

                    <div className="synchronized-replay-unavailable">

                      <strong>{entry?.item?.phrase || "FSL phrase"}</strong>

                      <span>FSL video currently unavailable for this recorded event.</span>

                    </div>

                  );

                }



                return (

                  <div className="synchronized-replay-fsl">

                    <div className="synchronized-replay-fsl-header">

                      <div>

                        <span>FSL EVENT</span>

                        <strong>{entry.item.phrase}</strong>

                        <small>{entry.item.filipino || "N/A"}</small>

                      </div>

                      <span>{formatReplayOffset(offset)}</span>

                    </div>

                    <video

                      ref={syncVideoRef}

                      key={`sync-${entry.index}-${phrase.video}`}

                      className="synchronized-replay-video"

                      muted

                      playsInline

                      preload="auto"

                      controls

                      onPlay={() => setSyncFslPlaying(true)}

                      onPause={() => setSyncFslPlaying(false)}

                      onEnded={handleSyncVideoEnded}

                      onError={() => setSyncFslPlaying(false)}

                    >

                      <source src={phrase.video} type="video/mp4" />

                      Your browser does not support video playback.

                    </video>

                  </div>

                );

              })()}



              {syncFslIndex < 0 && (

                <div className="synchronized-replay-empty">

                  {syncFslPlaying

                    ? "FSL event playing..."

                    : "Start or seek through the recording to replay synchronized FSL events."}

                </div>

              )}

            </div>



            <div className="synchronized-replay-events">

              {synchronizedReplayItems.map((entry) => (

                <div

                  key={`sync-event-${entry.index}-${entry.item?.key || entry.item?.phrase || "fsl"}`}

                  className={entry.index === syncFslIndex ? "synchronized-replay-event active" : "synchronized-replay-event"}

                >

                  <span>{formatReplayOffset(getRecordingOffsetSeconds(entry.item))}</span>

                  <strong>{entry.item?.phrase || "Unknown phrase"}</strong>

                  <small>{entry.item?.filipino || "N/A"}</small>

                </div>

              ))}

            </div>



            <p className="synchronized-replay-note">
              FSL timing is based on the moment the phrase was detected during recording. It is not a claim of frame-perfect speech timing.
              {hasUnsynchronizedLegacyFslEvents && (
                <>
                  {" "}
                  Some older saved events do not contain recorded timing data, so only events with saved offsets can auto-sync to the recording.
                </>
              )}
            </p>

          </section>

        )

      }





      {

        fslHistory.length > 0 && (



          <section

            className={

              "details-card fsl-history-card"

            }

          >



            <div

              className={

                "fsl-history-heading-row"

              }

            >



              <div>



                <h3>

                  🤟 FSL Detection History

                </h3>



                <p

                  className={

                    "fsl-history-subtitle"

                  }

                >

                  Review detected FSL phrases

                  using one compact video player.

                </p>



              </div>





              <div

                className={

                  "fsl-history-actions"

                }

              >



                {

                  sequentialPlaying ? (



                    <button

                      type="button"

                      className={

                        "fsl-sequence-button stop"

                      }

                      onClick={

                        handleStopSequence

                      }

                    >

                      ■ Stop Sequence

                    </button>



                  ) : (



                    <button

                      type="button"

                      className={

                        "fsl-sequence-button"

                      }

                      onClick={

                        handlePlayAll

                      }

                    >

                      ▶ Play All

                    </button>



                  )

                }



              </div>



            </div>





            <div

              className={

                "fsl-replay-layout"

              }

            >



              <div

                className={

                  "fsl-replay-player-panel"

                }

              >



                <div

                  className={

                    "fsl-replay-player-header"

                  }

                >



                  <div>



                    <span

                      className={

                        "fsl-replay-label"

                      }

                    >

                      NOW PLAYING

                    </span>





                    <strong>

                      {

                        selectedHistoryItem

                          ?.phrase ||

                        "FSL phrase"

                      }

                    </strong>





                    <span

                      className={

                        "fsl-replay-filipino"

                      }

                    >

                      {

                        selectedHistoryItem

                          ?.filipino ||

                        "N/A"

                      }

                    </span>



                  </div>





                  {

                    selectedDetectedTime && (



                      <span

                        className={

                          "fsl-replay-time"

                        }

                      >

                        Detected:{" "}

                        {

                          selectedDetectedTime

                        }

                      </span>



                    )

                  }



                </div>





                <div

                  className={

                    "fsl-replay-video-wrapper"

                  }

                >



                  {

                    selectedMatchedPhrase

                      ?.video &&

                    !videoError ? (



                      <video

                        ref={videoRef}

                        key={

                          `${selectedReplayItem?.index}-${selectedMatchedPhrase.video}`

                        }

                        className={

                          "fsl-replay-video"

                        }

                        controls

                        playsInline

                        preload="metadata"

                        onEnded={

                          handleVideoEnded

                        }

                        onError={

                          handleVideoError

                        }

                      >



                        <source

                          src={

                            selectedMatchedPhrase

                              .video

                          }

                          type="video/mp4"

                        />



                        Your browser does not

                        support video playback.



                      </video>



                    ) : (



                      <div

                        className={

                          "fsl-replay-unavailable"

                        }

                      >



                        <strong>

                          FSL video currently unavailable.

                        </strong>



                        <span>

                          The detected phrase is

                          still saved in this session.

                        </span>



                      </div>



                    )

                  }



                </div>



              </div>





              <div

                className={

                  "fsl-replay-queue-panel"

                }

              >



                <div

                  className={

                    "fsl-replay-queue-header"

                  }

                >



                  <strong>

                    Detected Phrases

                  </strong>



                  <span>

                    {replayItems.length}

                  </span>



                </div>





                <div

                  className={

                    "fsl-replay-queue-list"

                  }

                >



                  {

                    replayItems.map(

                      (entry) => {



                        const isSelected =

                          entry.index ===

                          selectedFslIndex;



                        const hasVideo =

                          Boolean(

                            entry

                              .matchedPhrase

                              ?.video

                          );



                        return (



                          <button

                            type="button"

                            key={

                              `${entry.index}-${entry.item?.key || entry.item?.phrase || "fsl"}`

                            }

                            className={

                              isSelected

                                ? "fsl-replay-queue-item active"

                                : "fsl-replay-queue-item"

                            }

                            onClick={() =>

                              handleSelectFsl(

                                entry.index

                              )

                            }

                          >



                            <span

                              className={

                                "fsl-replay-queue-number"

                              }

                            >

                              {

                                entry.index + 1

                              }

                            </span>





                            <span

                              className={

                                "fsl-replay-queue-text"

                              }

                            >



                              <strong>

                                {

                                  entry.item

                                    ?.phrase ||

                                  "Unknown phrase"

                                }

                              </strong>





                              <span>

                                {

                                  entry.item

                                    ?.filipino ||

                                  "N/A"

                                }

                              </span>





                              {

                                formatDetectedTime(

                                  entry.item

                                    ?.detectedAt

                                ) && (



                                  <small>

                                    {

                                      formatDetectedTime(

                                        entry.item

                                          ?.detectedAt

                                      )

                                    }

                                  </small>



                                )

                              }



                            </span>





                            <span

                              className={

                                hasVideo

                                  ? "fsl-replay-queue-status available"

                                  : "fsl-replay-queue-status unavailable"

                              }

                              title={

                                hasVideo

                                  ? "Video available"

                                  : "Video unavailable"

                              }

                            >

                              {

                                hasVideo

                                  ? "▶"

                                  : "—"

                              }

                            </span>



                          </button>



                        );

                      }

                    )

                  }



                </div>



              </div>



            </div>





            <p

              className={

                "fsl-replay-note"

              }

            >

              This section provides manual sequential review of saved FSL detections. Use the synchronized replay above when timestamped recording events are available.

            </p>



          </section>



        )

      }





    </div>



  );



}





export default HistoryDetails;