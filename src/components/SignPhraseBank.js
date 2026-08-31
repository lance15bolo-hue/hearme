import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaSignLanguage,
  FaSearch,
  FaPlayCircle,
  FaInfoCircle,
} from "react-icons/fa";

import { fslPhrases } from "./fslPhrases";
import "./SignPhraseBank.css";

export default function SignPhraseBank() {
  const categories = [
    "All",
    "Greetings",
    "Common Phrases",
    "Classroom",
    "Emergency",
  ];

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("All");

  const [
    selectedPhrase,
    setSelectedPhrase,
  ] = useState(null);

  const mobilePreviewRef =
    useRef(null);

  const filteredPhrases =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return fslPhrases.filter(
        (item) => {
          const matchesCategory =
            selectedCategory ===
              "All" ||
            item.category ===
              selectedCategory;

          const matchesSearch =
            item.phrase
              .toLowerCase()
              .includes(search) ||
            item.filipino
              .toLowerCase()
              .includes(search) ||
            item.category
              .toLowerCase()
              .includes(search);

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      searchTerm,
      selectedCategory,
    ]);

  const handlePhraseSelect = (
    item
  ) => {
    setSelectedPhrase(item);

    /*
      On mobile, move the user
      directly to the selected
      FSL preview.
    */
    setTimeout(() => {
      if (
        window.innerWidth <= 600 &&
        mobilePreviewRef.current
      ) {
        mobilePreviewRef.current.scrollIntoView(
          {
            behavior: "smooth",
            block: "start",
          }
        );
      }
    }, 100);
  };

  const renderPhraseDetail = (
    extraClass = ""
  ) => {
    if (!selectedPhrase) {
      return (
        <div
          className={`sign-bank-hint ${extraClass}`}
        >
          <FaSignLanguage />

          <div>
            <strong>
              Select a phrase
            </strong>

            <span>
              Choose any phrase to
              view its FSL reference.
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`sign-detail ${extraClass}`}
      >
        <div className="sign-detail-content">

          <div className="sign-detail-info">

            <span className="sign-category-badge">
              {
                selectedPhrase.category
              }
            </span>

            <h3>
              {
                selectedPhrase.phrase
              }
            </h3>

            <p className="sign-filipino">
              {
                selectedPhrase.filipino
              }
            </p>

            <p className="sign-description">
              <FaInfoCircle />

              {
                selectedPhrase.description
              }
            </p>

          </div>

          <div className="sign-video-area">

            {selectedPhrase.video ? (
              <video
                key={
                  selectedPhrase.video
                }
                src={
                  selectedPhrase.video
                }
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={`FSL reference for ${selectedPhrase.phrase}`}
              >
                Your browser does not
                support video playback.
              </video>
            ) : (
              <div className="sign-video-placeholder">

                <FaPlayCircle />

                <strong>
                  FSL video coming soon
                </strong>

                <span>
                  A verified FSL clip
                  will be placed here.
                </span>

              </div>
            )}

          </div>

        </div>
      </div>
    );
  };

  return (
    <section className="panel sign-bank-page">

      {/* HEADER */}
      <div className="sign-bank-header">

        <div>
          <h2>
            <FaSignLanguage />
            FSL Phrase Bank
          </h2>

          <p className="sign-bank-subtitle">
            Browse common phrases and
            their Filipino Sign Language
            visual references.
          </p>
        </div>

      </div>

      {/* SEARCH */}
      <div className="search-wrap">

        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search English or Filipino phrase..."
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(
              event.target.value
            )
          }
        />

      </div>

      {/* CATEGORIES */}
      <div className="cat-pills">

        {categories.map(
          (category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory ===
                category
                  ? "cat-pill active"
                  : "cat-pill"
              }
              onClick={() =>
                setSelectedCategory(
                  category
                )
              }
            >
              {category}
            </button>
          )
        )}

      </div>

      {/* MOBILE SELECTED PREVIEW */}
      <div
        ref={mobilePreviewRef}
        className="sign-mobile-preview"
      >
        {renderPhraseDetail()}
      </div>

      {/* PHRASE COUNT */}
      <div className="phrase-count">
        {filteredPhrases.length} phrase
        {filteredPhrases.length !== 1
          ? "s"
          : ""}{" "}
        found
      </div>

      {/* PHRASE LIST */}
      {filteredPhrases.length > 0 ? (
        <div className="phrases-grid">

          {filteredPhrases.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                className={
                  selectedPhrase?.id ===
                  item.id
                    ? "phrase-card active"
                    : "phrase-card"
                }
                onClick={() =>
                  handlePhraseSelect(
                    item
                  )
                }
              >

                <div className="phrase-card-name">
                  {item.phrase}
                </div>

                <div className="phrase-card-filipino">
                  {item.filipino}
                </div>

                <div className="phrase-card-category">
                  {item.category}
                </div>

              </button>
            )
          )}

        </div>
      ) : (
        <div className="phrase-empty-state">

          <FaSearch />

          <h3>
            No phrase found
          </h3>

          <p>
            Try another keyword or
            choose a different category.
          </p>

        </div>
      )}

      {/* DESKTOP FLOATING SELECTED PREVIEW */}
{selectedPhrase && (
  <div className="sign-desktop-floating-preview">
    {renderPhraseDetail("sign-floating-detail")}
  </div>
)}

    </section>
  );
}