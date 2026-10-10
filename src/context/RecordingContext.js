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

  const streamRef = useRef(null);

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




  const startRecording = async () => {

    try {


      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio:true,
        });



      streamRef.current = stream;


      chunksRef.current = [];

      recordingUrlRef.current = "";
      recordingStartedAtRef.current = 0;

      setRecordingUrl("");



      const recorder =
        new MediaRecorder(stream);



      mediaRecorderRef.current =
        recorder;




      recorder.ondataavailable = (event)=>{


        console.log(
          "DATA AVAILABLE:",
          event.data.size
        );



        if(event.data.size > 0){

          chunksRef.current.push(
            event.data
          );

        }

      };





      recorder.onstop = async()=>{


        console.log(
          "ONSTOP EVENT FIRED"
        );



        const chunks = [
          ...chunksRef.current
        ];



        console.log(
          "FINAL CHUNKS:",
          chunks.length
        );



        uploadPromiseRef.current =
          (async()=>{


            try{


              const blob =
                new Blob(
                  chunks,
                  {
                    type:"audio/webm",
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



              setRecordingUrl(
                url
              );



              return url;



            }catch(error){


              console.error(
                "UPLOAD ERROR:",
                error
              );


              return "";

            }


          })();


      };




      // Timestamp anchor for the saved audio timeline.
      recordingStartedAtRef.current = Date.now();

      recorder.start(1000);



      setIsRecording(true);



      console.log(
        "Recording started"
      );



    }catch(error){


      console.error(
        "Recording start error:",
        error
      );


    }

  };







  const stopRecording = () => {


    if(
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ){

      mediaRecorderRef.current.stop();

    }



    if(streamRef.current){


      streamRef.current
        .getTracks()
        .forEach(
          track => track.stop()
        );


      streamRef.current = null;

    }



    setIsRecording(false);



    console.log(
      "Recording stopped"
    );


  };







  const waitForUpload = async()=>{


    if(uploadPromiseRef.current){

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