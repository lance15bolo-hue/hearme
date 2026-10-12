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


  const mediaRecorderRef = useRef(null);

  // The recorder always records this stable destination stream.
  // A Web Audio mixer lets us switch between microphone and classroom
  // audio without adding/removing tracks from the MediaRecorder stream.
  const streamRef = useRef(null);

  const audioContextRef = useRef(null);
  const destinationNodeRef = useRef(null);

  const microphoneStreamRef = useRef(null);
  const microphoneSourceRef = useRef(null);
  const microphoneGainRef = useRef(null);

  const classroomStreamRef = useRef(null);
  const classroomSourceRef = useRef(null);
  const classroomGainRef = useRef(null);

  const chunksRef = useRef([]);

  const recordingUrlRef = useRef("");

  const uploadPromiseRef = useRef(null);

  // Timestamp anchor for synchronizing saved accessibility events
  // with the recorded audio timeline.
  const recordingStartedAtRef = useRef(0);



  const [isRecording, setIsRecording] =
    useState(false);


  const [recordingUrl, setRecordingUrl] =
    useState("");


  const getAudioContextConstructor = () => {
    return (
      window.AudioContext ||
      window.webkitAudioContext ||
      null
    );
  };


  const disconnectClassroomSource = () => {
    if (classroomSourceRef.current) {
      try {
        classroomSourceRef.current.disconnect();
      } catch (error) {
        // Source may already be disconnected.
      }
    }

    classroomSourceRef.current = null;

    if (classroomGainRef.current) {
      try {
        classroomGainRef.current.disconnect();
      } catch (error) {
        // Gain may already be disconnected.
      }
    }

    classroomGainRef.current = null;
    classroomStreamRef.current = null;
  };


  const disconnectMicrophoneSource = () => {
    if (microphoneSourceRef.current) {
      try {
        microphoneSourceRef.current.disconnect();
      } catch (error) {
        // Source may already be disconnected.
      }
    }

    microphoneSourceRef.current = null;

    if (microphoneGainRef.current) {
      try {
        microphoneGainRef.current.disconnect();
      } catch (error) {
        // Gain may already be disconnected.
      }
    }

    microphoneGainRef.current = null;
  };


  const connectMicrophoneSource = async (stream) => {
    const audioContext = audioContextRef.current;
    const destination = destinationNodeRef.current;

    if (!audioContext || !destination || !stream) {
      return false;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return false;
    }

    disconnectMicrophoneSource();

    const source =
      audioContext.createMediaStreamSource(
        stream
      );

    const gain =
      audioContext.createGain();

    gain.gain.value =
      classroomStreamRef.current ? 0 : 1;

    source.connect(gain);
    gain.connect(destination);

    microphoneStreamRef.current =
      stream;
    microphoneSourceRef.current =
      source;
    microphoneGainRef.current =
      gain;

    return true;
  };


  const connectClassroomSource = async (stream) => {
    const audioContext = audioContextRef.current;
    const destination = destinationNodeRef.current;

    if (!audioContext || !destination || !stream) {
      return false;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return false;
    }

    const track = audioTracks[0];

    if (track.readyState !== "live") {
      return false;
    }

    disconnectClassroomSource();

    const source =
      audioContext.createMediaStreamSource(
        stream
      );

    const gain =
      audioContext.createGain();

    // Classroom audio becomes the active recording source.
    // The microphone remains connected but muted so that the recorder's
    // destination stream keeps exactly one stable audio track.
    gain.gain.value = 1;

    source.connect(gain);
    gain.connect(destination);

    classroomStreamRef.current =
      stream;
    classroomSourceRef.current =
      source;
    classroomGainRef.current =
      gain;

    if (microphoneGainRef.current) {
      microphoneGainRef.current.gain.value = 0;
    }

    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch (error) {
        console.warn(
          "Unable to resume recording audio context:",
          error
        );
      }
    }

    return true;
  };


  const restoreMicrophoneSource = async () => {
    if (microphoneGainRef.current) {
      microphoneGainRef.current.gain.value = 1;
    }

    if (classroomGainRef.current) {
      classroomGainRef.current.gain.value = 0;
    }

    if (audioContextRef.current?.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn(
          "Unable to resume recording audio context:",
          error
        );
      }
    }
  };


  const cleanupAudioGraph = async () => {
    disconnectClassroomSource();
    disconnectMicrophoneSource();

    if (microphoneStreamRef.current) {
      microphoneStreamRef.current
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch (error) {
            // Track may already be stopped.
          }
        });

      microphoneStreamRef.current = null;
    }

    const audioContext =
      audioContextRef.current;

    audioContextRef.current = null;
    destinationNodeRef.current = null;
    streamRef.current = null;

    if (audioContext) {
      try {
        await audioContext.close();
      } catch (error) {
        console.warn(
          "Recording audio context cleanup error:",
          error
        );
      }
    }
  };


  const createRecordingGraph = async (sourceStream = null) => {
    const AudioContextConstructor =
      getAudioContextConstructor();

    if (!AudioContextConstructor) {
      throw new Error(
        "Web Audio API is not supported in this browser."
      );
    }

    const audioContext =
      new AudioContextConstructor();

    const destination =
      audioContext.createMediaStreamDestination();

    audioContextRef.current =
      audioContext;
    destinationNodeRef.current =
      destination;

    streamRef.current =
      destination.stream;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (sourceStream) {
      const connected =
        await connectClassroomSource(
          sourceStream
        );

      if (!connected) {
        throw new Error(
          "The selected classroom source has no live audio track."
        );
      }
    } else {
      const microphoneStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const connected =
        await connectMicrophoneSource(
          microphoneStream
        );

      if (!connected) {
        microphoneStream
          .getTracks()
          .forEach((track) => track.stop());

        throw new Error(
          "The microphone audio track is not available."
        );
      }
    }

    return destination.stream;
  };


  const startRecording = async (sourceStream = null) => {

    if (isRecording || mediaRecorderRef.current) {
      return;
    }

    try {

      chunksRef.current = [];

      recordingUrlRef.current = "";
      recordingStartedAtRef.current = 0;
      uploadPromiseRef.current = null;

      setRecordingUrl("");

      const stream =
        await createRecordingGraph(
          sourceStream
        );

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable = (event) => {
        console.log(
          "DATA AVAILABLE:",
          event.data.size
        );

        if (event.data.size > 0) {
          chunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "Recording error:",
          event?.error || event
        );
      };

      recorder.onstop = async () => {
        console.log(
          "ONSTOP EVENT FIRED"
        );

        setIsRecording(false);

        const chunks = [
          ...chunksRef.current,
        ];

        console.log(
          "FINAL CHUNKS:",
          chunks.length
        );

        uploadPromiseRef.current =
          (async () => {
            try {
              const blob =
                new Blob(
                  chunks,
                  {
                    type: "audio/webm",
                  }
                );

              console.log(
                "BLOB SIZE:",
                blob.size
              );

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

              console.log(
                "UPLOAD SUCCESS"
              );

              const url =
                await getDownloadURL(
                  storageRef
                );

              console.log(
                "DOWNLOAD URL:",
                url
              );

              recordingUrlRef.current =
                url;

              setRecordingUrl(url);

              return url;
            } catch (error) {
              console.error(
                "UPLOAD ERROR:",
                error
              );

              return "";
            }
          })();

        // The blob has already received its final data. The audio graph can
        // now be released without affecting the saved recording.
        await cleanupAudioGraph();
        mediaRecorderRef.current =
          null;
      };

      recordingStartedAtRef.current =
        Date.now();

      recorder.start(1000);

      setIsRecording(true);

      console.log(
        sourceStream
          ? "Classroom recording started"
          : "Recording started"
      );
    } catch (error) {
      console.error(
        "Recording start error:",
        error
      );

      mediaRecorderRef.current =
        null;

      await cleanupAudioGraph();

      setIsRecording(false);
    }
  };


  /*
    Attach or replace the classroom audio source while a recording is
    already running. The MediaRecorder keeps recording the same single
    destination track, so we do not add/remove tracks from the recorded
    MediaStream.
  */
  const setExternalRecordingStream = async (
    sourceStream
  ) => {
    if (!mediaRecorderRef.current ||
        !audioContextRef.current ||
        !destinationNodeRef.current) {
      return false;
    }

    if (!sourceStream) {
      disconnectClassroomSource();
      await restoreMicrophoneSource();
      return true;
    }

    const connected =
      await connectClassroomSource(
        sourceStream
      );

    if (!connected) {
      return false;
    }

    return true;
  };


  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      console.log(
        "Recording stopped"
      );
      return;
    }

    setIsRecording(false);
  };


  const waitForUpload = async () => {
    if (uploadPromiseRef.current) {
      return await uploadPromiseRef.current;
    }

    return recordingUrlRef.current;
  };


  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        recordingUrl,
        recordingUrlRef,
        recordingStartedAtRef,
        startRecording,
        stopRecording,
        waitForUpload,
        setExternalRecordingStream,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}


export function useRecording() {
  return useContext(
    RecordingContext
  );
}
