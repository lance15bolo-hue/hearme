import React, { useState, useRef } from "react";
import { FaMicrophoneAlt, FaStop, FaRecordVinyl } from "react-icons/fa";

import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from "../firebase";

export default function Recorder() {

  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");

  const chunks = useRef([]);


  const startRecording = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });


      const rec =
        new MediaRecorder(stream);


      rec.ondataavailable = (e) => {

        if (e.data.size) {
          chunks.current.push(e.data);
        }

      };


      rec.onstop = async () => {

        const blob =
          new Blob(
            chunks.current,
            {
              type: "audio/webm"
            }
          );


        chunks.current = [];


        try {

          const fileName =
            `recordings/hearme_${Date.now()}.webm`;


          const storageRef =
            ref(
              storage,
              fileName
            );


          await uploadBytes(
            storageRef,
            blob
          );


          const downloadUrl =
            await getDownloadURL(
              storageRef
            );


          setAudioUrl(downloadUrl);


          console.log(
            "Recording uploaded:",
            downloadUrl
          );


        } catch(error) {

          console.error(
            "Upload failed:",
            error
          );

        }


        stream
          .getTracks()
          .forEach(
            track => track.stop()
          );

      };


      rec.start();

      setRecorder(rec);
      setRecording(true);


    } catch {

      alert(
        "Microphone access denied or unavailable."
      );

    }

  };


  const stopRecording = () => {

    recorder?.stop();

    setRecording(false);

  };


  return (

    <section className="panel">

      <h2>
        <FaMicrophoneAlt />
        Meeting Recorder
      </h2>


      <button
        className={
          recording
          ? "btn stop"
          : "btn start"
        }
        onClick={
          recording
          ? stopRecording
          : startRecording
        }
      >

        {
          recording
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
        audioUrl && (

          <audio
            controls
            src={audioUrl}
          />

        )
      }

    </section>

  );

}