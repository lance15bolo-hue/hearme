import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";
import "./History.css";


function History({
  user,
  setActivePage,
  setSelectedHistory
}) {


  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {


    if (!user || user.role === "guest" || !user.uid) {

      setSessions([]);
      setLoading(false);

      return;

    }



    const q = query(

      collection(
        db,
        "academicSessions"
      ),

      where(
        "userId",
        "==",
        user.uid
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );



    const unsubscribe = onSnapshot(

      q,

      (snapshot) => {


        const data = snapshot.docs.map((doc) => ({

          id: doc.id,

          ...doc.data()

        }));



        const sortedData = data.sort((a,b)=>{


          const dateA = new Date(
            a.sessionDate || a.createdAt || 0
          );


          const dateB = new Date(
            b.sessionDate || b.createdAt || 0
          );


          return dateB - dateA;


        });



        setSessions(sortedData);

        setLoading(false);


      },

      () => {

        setLoading(false);

      }

    );



    return () => unsubscribe();


  }, [user]);





  const formatDate = (date)=>{


    if(!date) return "N/A";


    const formatted = new Date(date);



    if(isNaN(formatted)){

      return date;

    }



    return formatted.toLocaleDateString(
      "en-US",
      {
        year:"numeric",
        month:"long",
        day:"numeric"
      }
    );


  };






  if(loading){

    return (

      <div className="history-container">

        <h2>
          Academic Session History
        </h2>


        <p className="history-loading">
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





      {
        sessions.length === 0 ?


        (

          <div className="history-empty">

            <h3>
              No Sessions Found
            </h3>


            <p>
              Saved academic sessions will appear here.
            </p>


          </div>


        )

        :

        (


          <div className="history-list">


          {
            sessions.map((session)=>(


              <div

                key={session.id}

                className="history-card"

              >



                <h3>

                  📚 {session.subject || "Untitled Session"}

                </h3>





                <div className="history-info">


                  <p>

                    <strong>
                      👤 Instructor
                    </strong>

                    {session.instructor || "N/A"}

                  </p>




                  <p>

                    <strong>
                      📅 Date
                    </strong>

                    {formatDate(session.sessionDate)}

                  </p>




                  <p>

                    <strong>
                      🏫 Context
                    </strong>

                    {session.context || "N/A"}

                  </p>



                </div>





                <button

                  className="history-view-btn"

                  onClick={()=>{

                    setSelectedHistory(session);

                    setActivePage(
                      "historyDetails"
                    );

                  }}

                >

                  View Session →

                </button>



              </div>


            ))

          }


          </div>


        )

      }



    </div>

  );


}


export default History;