import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

function History({ user }) {

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    if (!user || user.role === "guest" || !user.uid) {
      setSessions([]);
      setLoading(false);
      return;
    }


    console.log("Current user UID:", user.uid);


    const q = query(
      collection(db, "academicSessions"),
      where("userId", "==", user.uid)
    );


    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {

        const historyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));


        console.log(
          "History loaded:",
          historyData
        );


        setSessions(historyData);
        setLoading(false);

      },

      (error) => {

        console.error(
          "Error loading history:",
          error
        );

        setLoading(false);

      }
    );


    return () => unsubscribe();


  }, [user]);



  if (loading) {

    return (
      <div className="history-container">
        <h2>
          Academic Session History
        </h2>

        <p>
          Loading sessions...
        </p>
      </div>
    );

  }



  return (

    <div className="history-container">

      <h2>
        Academic Session History
      </h2>



      {selectedSession && (

        <div
          className="history-details"
          style={{
            border: "1px solid #555",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "25px",
          }}
        >

          <h3>
            Selected Session
          </h3>


          <p>
            <strong>
              Subject:
            </strong>{" "}
            {selectedSession.subject || "N/A"}
          </p>


          <p>
            <strong>
              Instructor:
            </strong>{" "}
            {selectedSession.instructor || "N/A"}
          </p>


          <p>
            <strong>
              Date:
            </strong>{" "}
            {selectedSession.sessionDate || "N/A"}
          </p>


          <p>
            <strong>
              Context:
            </strong>{" "}
            {selectedSession.context || "N/A"}
          </p>


          <hr />


          <h4>
            Caption Transcript
          </h4>


          <p>
            {selectedSession.captions ||
              "No caption available."}
          </p>



          <h4>
            Translation
          </h4>


          <p>
            {selectedSession.translated ||
              "No translation available."}
          </p>



          <p>
            <strong>
              Status:
            </strong>{" "}
            {selectedSession.sessionStatus ||
              "Completed"}
          </p>


        </div>

      )}




      <h3>
        Saved Sessions
      </h3>



      {sessions.length === 0 ? (

        <p>
          No saved sessions found.
        </p>

      ) : (

        sessions.map((session) => (

          <div

            key={session.id}

            className="history-card"

            onClick={() =>
              setSelectedSession(session)
            }

            style={{
              cursor: "pointer",
              border: "1px solid #555",
              padding: "15px",
              marginBottom: "12px",
              borderRadius: "10px",
            }}

          >

            <h3>
              {session.subject ||
                "Untitled Session"}
            </h3>


            <p>
              <strong>
                Instructor:
              </strong>{" "}
              {session.instructor || "N/A"}
            </p>


            <p>
              <strong>
                Date:
              </strong>{" "}
              {session.sessionDate || "N/A"}
            </p>


            <p>
              <strong>
                Status:
              </strong>{" "}
              {session.sessionStatus ||
                "Completed"}
            </p>


          </div>

        ))

      )}


    </div>

  );

}


export default History;