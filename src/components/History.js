import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
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


    const q = query(
      collection(db, "academicSessions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );


    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {

        const historyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));


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
      <div>
        <h2>Transcript History</h2>
        <p>Loading history...</p>
      </div>
    );

  }



  if (!user || user.role === "guest") {

    return (
      <div className="history-container">

        <h2>
          Transcript History
        </h2>

        <p>
          History is available for registered users only.
          Please login to save and view your transcripts.
        </p>

      </div>
    );

  }



  return (

    <div className="history-container">

      <h2>
        Transcript History
      </h2>


      {sessions.length === 0 ? (

        <p>
          No saved transcript sessions found.
        </p>

      ) : (

        <div>

          {sessions.map((session) => (

            <div

              key={session.id}

              className="history-card"

              onClick={() =>
                setSelectedSession(session)
              }


              style={{

                cursor: "pointer",

                border:
                  "1px solid #ddd",

                padding:
                  "15px",

                marginBottom:
                  "10px",

                borderRadius:
                  "8px",

              }}

            >

              <h3>
                {session.subject}
              </h3>


              <p>
                <strong>
                  Instructor:
                </strong>{" "}

                {session.instructor}

              </p>


              <p>

                <strong>
                  Date:
                </strong>{" "}

                {session.sessionDate}

              </p>


            </div>

          ))}

        </div>

      )}



      {selectedSession && (

        <div

          className="history-details"

          style={{

            marginTop:
              "20px",

            padding:
              "15px",

            border:
              "1px solid #ccc",

            borderRadius:
              "8px",

          }}

        >

          <h3>
            {selectedSession.subject}
          </h3>


          <p>

            <strong>
              Transcript:
            </strong>

          </p>


          <p>
            {selectedSession.captions}
          </p>



          {selectedSession.translated && (

            <>

              <p>

                <strong>
                  Translation:
                </strong>

              </p>


              <p>
                {selectedSession.translated}
              </p>

            </>

          )}


        </div>

      )}


    </div>

  );

}


export default History;