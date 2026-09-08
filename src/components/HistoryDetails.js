import React from "react";
import "./HistoryDetails.css";


function HistoryDetails({
  session,
  setActivePage
}) {


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




  const formatDate = (date) => {

    if (!date) return "N/A";


    const formattedDate = new Date(date);


    if (isNaN(formattedDate)) {

      return date;

    }


    return formattedDate.toLocaleDateString(
      "en-US",
      {
        year:"numeric",
        month:"long",
        day:"numeric"
      }
    );

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
            {formatDate(session.sessionDate)}
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
            session.inputMode || "N/A"
          }


          {" → "}


          {
            session.languageOutput || "N/A"
          }


        </div>


      </section>



    </div>

  );

}


export default HistoryDetails;