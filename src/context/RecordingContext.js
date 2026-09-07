import React, {
  createContext,
  useContext,
  useRef,
  useState,
} from "react";

import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "../firebase";


const RecordingContext = createContext();


export function RecordingProvider({ children }) {

  const mediaRecorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);


  // latest recording URL (instant access)
  const recordingUrlRef =
    useRef("");


  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingUrl, setRecordingUrl] =
    useState("");


  const startRecording = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });


      streamRef.current = stream;


      // clear previous chunks
      chunksRef.current = [];


      const recorder =
        new MediaRecorder(stream);


      mediaRecorderRef.current =
        recorder;


      recorder.ondataavailable = (event) => {

        if (event.data.size > 0) {

          chunksRef.current.push(
            event.data
          );

        }

      };


      recorder.onstop = async () => {

        try {

          const blob =
            new Blob(
              chunksRef.current,
              {
                type: "audio/webm",
              }
            );


          chunksRef.current = [];


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


          const url =
            await getDownloadURL(
              storageRef
            );


          // save latest url
          recordingUrlRef.current = url;

          setRecordingUrl(url);


          console.log(
            "Recording uploaded:",
            url
          );


          if (streamRef.current) {

            streamRef.current
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );


            streamRef.current = null;

          }


        } catch(error) {

          console.error(
            "Recording upload error:",
            error
          );

        }

      };


      recorder.start();


      setIsRecording(true);


      console.log(
        "Recording started"
      );


    } catch(error) {

      console.error(
        "Recording error:",
        error
      );

    }

  };


  const stopRecording = () => {

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {

      mediaRecorderRef.current.stop();

    }


    setIsRecording(false);


    console.log(
      "Recording stopped"
    );

  };


  return (

    <RecordingContext.Provider
      value={{
        isRecording,
        recordingUrl,
        recordingUrlRef,
        startRecording,
        stopRecording,
      }}
    >

      {children}

    </RecordingContext.Provider>

  );

}


export function useRecording(){

  return useContext(
    RecordingContext
  );

}