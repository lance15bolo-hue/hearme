import React from "react";
import { FaMicrophoneAlt, FaStop, FaRecordVinyl } from "react-icons/fa";

import { useRecording } from "../context/RecordingContext";

export default function Recorder() {

  const {
    isRecording,
    startRecording,
    stopRecording,
    recordingUrl
  } = useRecording();


  return (

    <section className="panel">

      <h2>
        <FaMicrophoneAlt />
        Meeting Recorder
      </h2>


      <button
        className={
          isRecording
            ? "btn stop"
            : "btn start"
        }
        onClick={
          isRecording
            ? stopRecording
            : startRecording
        }
      >

        {
          isRecording
            ?
            <>
              <FaStop />
              Stop Recording
            </>
            :
            <>
              <FaRecordVinyl />
              Start Recording
            </>
        }

      </button>


      <p className="hint">
        Recording will be uploaded after stopping.
      </p>


      {
        recordingUrl && (

          <audio
            controls
            src={recordingUrl}
          />

        )
      }


    </section>

  );

}