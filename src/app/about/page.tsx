"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useToast } from "../../components/ToastSystem";
import { useAppContext } from "../../context/AppContext";
import { SUGGESTION_STATUS } from "../../constants";
import type { SuggestionStatus } from "../../types/suggestion";

export default function AboutPage() {
  const { user, dataProvider } = useAppContext();
  const [suggestion, setSuggestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const toast = useToast();

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setIsSending(true);
    try {
      await dataProvider.addSuggestion({
        userId: user?.uid || "anonymous",
        userName: user?.displayName || "Anonymous",
        userEmail: user?.email || "anonymous",
        message: suggestion,
        status: SUGGESTION_STATUS.UNREAD as SuggestionStatus,
      });
      toast.success("Thank you for your suggestion!");
      setSuggestion("");
    } catch (error) {
      console.error("Error sending suggestion:", error);
      toast.error("Failed to send suggestion. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="about-page-container">
      <div className="about-content">
        <div className="about-header">
          <h2>About Vanshavali</h2>
        </div>

        <div className="about-body">
          <section className="about-section">
            <h3>Motivation</h3>
            <p>
              Vanshavali was created with the vision of preserving family legacies and connecting generations. 
              Inspired by the rich cultural heritage of Mithila, this app aims to provide a beautiful and 
              intuitive way to explore and document your family tree, ensuring that our roots are never forgotten.
            </p>
          </section>

          <section className="about-section developer-info">
            <h3>The Developer</h3>
            <div className="developer-profile">
              <div className="developer-image-container">
                <Image 
                  src="/developer.png" 
                  alt="Developer" 
                  width={150} 
                  height={150} 
                  className="developer-image"
                />
              </div>
              <div className="developer-details">
                <p className="developer-name">Amulya Paritosh</p>
                <p className="developer-role">Full Stack Engineer</p>
                <div className="developer-connections">
                  <a href="https://github.com/amulyaparitosh" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://linkedin.com/in/amulyaparitosh" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  <a href="mailto:amulya.paritosh@example.com">Contact</a>
                </div>
              </div>
            </div>
          </section>

          <section className="about-section suggestions-section">
            <h3>Suggestions & Feature Requests</h3>
            <form onSubmit={handleSubmitSuggestion} className="suggestion-form">
              <textarea
                placeholder="Share your thoughts, suggestions or request new features..."
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSending || !suggestion.trim()}
              >
                {isSending ? "Sending..." : "Send Suggestion"}
              </button>
            </form>
          </section>
        </div>
      </div>

      <style jsx>{`
        .about-page-container {
          padding: 30px;
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .about-content {
          background: var(--color-bg);
          padding: 30px;
          border-radius: var(--border-radius-lg);
          width: 100%;
          max-width: 900px;
          border: 4px double var(--color-primary);
          box-shadow: var(--shadow-strong);
          background-color: var(--color-surface);
        }
        .about-header {
          border-bottom: 2px solid var(--color-primary);
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .about-header h2 {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 2.5em;
          color: var(--color-primary);
          text-align: center;
          position: relative;
          padding-bottom: 10px;
        }
        .about-header h2::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 30%;
          right: 30%;
          height: 2px;
          background: var(--color-primary);
          box-shadow: 0 4px 0 var(--color-secondary);
        }
        .about-section {
          margin-bottom: 40px;
        }
        .about-section h3 {
          font-family: var(--font-heading);
          color: var(--color-secondary);
          border-bottom: 2px solid var(--color-primary);
          padding-bottom: 8px;
          margin-bottom: 20px;
          font-size: 2em;
        }
        .about-section p {
          line-height: 1.8;
          color: var(--color-text);
          font-size: 1.1em;
        }
        .developer-profile {
          display: flex;
          gap: 40px;
          align-items: center;
          background: var(--color-bg);
          padding: 30px;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--color-node-border);
        }
        .developer-image-container {
          flex-shrink: 0;
          border: 4px solid var(--color-primary);
          border-radius: 50%;
          overflow: hidden;
          width: 150px;
          height: 150px;
          box-shadow: 0 4px 12px var(--color-shadow);
        }
        .developer-image {
          object-fit: cover;
        }
        .developer-name {
          font-size: 1.8em;
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--color-primary);
          font-family: var(--font-heading);
        }
        .developer-role {
          font-size: 1.1em;
          color: var(--color-text-light);
          margin-bottom: 20px;
        }
        .developer-connections {
          display: flex;
          gap: 20px;
        }
        .developer-connections a {
          color: var(--color-accent);
          text-decoration: none;
          font-weight: 600;
          font-size: 1em;
          padding: 5px 10px;
          border: 1px solid var(--color-accent);
          border-radius: var(--border-radius-sm);
          transition: all 0.2s;
        }
        .developer-connections a:hover {
          background-color: var(--color-accent);
          color: white;
        }
        .suggestion-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        textarea {
          width: 100%;
          min-height: 150px;
          padding: 20px;
          border: 1px solid var(--color-node-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg);
          font-family: var(--font-body);
          font-size: 1.1em;
          resize: vertical;
          box-sizing: border-box;
        }
        textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(178, 34, 34, 0.1);
        }
        .btn-primary {
          align-self: flex-end;
          padding: 12px 30px;
          font-size: 1.1em;
        }
      `}</style>
    </div>
  );
}
