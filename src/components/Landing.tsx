"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Landing (Spec 01) — the one public page. Eight full-bleed bands making the
 * vertical argument (loss, not features), ending in a single ask: one name.
 * No shell; its own sticky nav. Copy is shipped verbatim (the voice does as much
 * work as the layout). The two filled primary CTAs both go to /signin?intent=create.
 */

const CREATE = "/signin?intent=create";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      <nav className={`landing-nav${scrolled ? " scrolled" : ""}`}>
        <Link href="/" className="landing-wordmark">
          <span className="mark">Vanshavali</span>
          <span className="deva">वंशावली</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#why">Why</a>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
        </div>
        <div className="landing-nav-actions">
          <Link href="/signin" className="landing-nav-signin">
            Sign in
          </Link>
          <Link href={CREATE} className="landing-nav-start">
            Start a tree
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <span className="landing-eyebrow">वंशावली · the record of a lineage</span>
        <h1 className="landing-hero-h1">
          Every family loses a generation
          <br />
          to nobody writing it down.
        </h1>
        <p className="landing-hero-sub">
          Vanshavali is a shared, private record of who your people were — kept by the whole family,
          not one person&apos;s notebook.
        </p>
        <div className="landing-hero-actions">
          <Link href={CREATE} className="landing-cta">
            Start with your own name
          </Link>
          <Link href="/demo" className="landing-btn-secondary">
            See an example tree
          </Link>
        </div>
      </header>

      {/* Trust strip */}
      <div className="landing-trust">
        Free while we&apos;re small · no card · nothing public, ever
      </div>

      {/* The problem */}
      <section className="landing-band landing-problem" id="why">
        <div className="landing-band-text">
          <span className="landing-band-eyebrow">The problem</span>
          <h2 className="landing-band-h2">
            Naani knows all of it.
            <br />
            Nobody has asked her.
          </h2>
          <p>
            Names, villages, which household a daughter married into, which uncle left for Assam and
            why. It lives in one or two heads, it gets repeated at weddings, and then it goes quiet.
          </p>
          <p>
            A notebook helps for a while. Then the notebook is in one house, in one person&apos;s
            handwriting, and nobody else can add to it.
          </p>
        </div>
        <div className="landing-photo landing-photo--problem" aria-hidden="true">
          <span>an elder with grandchildren, warm interior</span>
        </div>
      </section>

      {/* What you get */}
      <section className="landing-band landing-get">
        <div className="landing-photo landing-photo--product" aria-hidden="true">
          <span>the Tree route with a record panel open</span>
        </div>
        <div className="landing-band-text">
          <span className="landing-band-eyebrow">What you get</span>
          <h2 className="landing-band-h2">A tree anyone in the family can add to.</h2>
          <p>
            Roles, not a free-for-all. You decide who may read and who may write. Invite the cousin
            who remembers dates; give your uncle his own branch to fill in.
          </p>
          <div className="landing-cards" id="privacy">
            <article className="landing-card">
              <h3>In plain words</h3>
              <p>
                Ask &ldquo;how am I related to her?&rdquo; and get an answer in words — your
                father&apos;s youngest brother&apos;s daughter · <em>चचेरी बहन</em> — not a diagram
                to decode.
              </p>
            </article>
            <article className="landing-card">
              <h3>One search</h3>
              <p>
                One search across everything — people, villages, marriages, dates. Type{" "}
                <em>Darbhanga</em> and see everyone born there.
              </p>
            </article>
            <article className="landing-card">
              <h3>Nothing is public</h3>
              <p>
                Nothing is public. Not indexed, not searchable, not sold. A relative sees your tree
                only after you invite them.
              </p>
            </article>
            <article className="landing-card">
              <h3>Yours to take</h3>
              <p>
                Export the whole record — every name, date and photograph — whenever you like. No
                lock-in on your family&apos;s history.
              </p>
            </article>
            <article className="landing-card">
              <h3>हिन्दी and English</h3>
              <p>
                Names in Devanagari with Latin beneath, so the generation who wrote them and the
                generation reading them both recognise them.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-band landing-how" id="how">
        <div className="landing-how-head">
          <h2 className="landing-band-h2">How it works</h2>
          <span className="landing-how-aside">an evening, not a project</span>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-n">1</span>
            <h3>Add yourself</h3>
            <p>
              One name and you have a tree. Birth year, village, a photograph — all optional,
              forever. Nothing blocks you from starting.
            </p>
          </div>
          <div className="landing-step">
            <span className="landing-step-n">2</span>
            <h3>Invite the keeper</h3>
            <p>
              Every family has one person who remembers. Give them writing rights and get out of the
              way.
            </p>
          </div>
          <div className="landing-step">
            <span className="landing-step-n">3</span>
            <h3>Print it for the wall</h3>
            <p>
              When it&apos;s grown, export a Madhubani-framed sheet: folded into a Diwali card, or
              hung in the hall where the next generation will see it.
            </p>
          </div>
        </div>
      </section>

      {/* Quotation */}
      <section className="landing-quote">
        <blockquote>
          &ldquo;I filled in four generations from my mother&apos;s memory in two evenings. My uncle
          in Delhi added the fifth before the week was out.&rdquo;
        </blockquote>
        <p className="landing-quote-attr">
          — Aniruddha M., Darbhanga · keeper of the Mishra record
        </p>
      </section>

      {/* Closing CTA */}
      <section className="landing-close">
        <span className="landing-close-eyebrow">Start with one name</span>
        <h2 className="landing-close-h2">
          Write your family down
          <br />
          before it needs remembering.
        </h2>
        <p>
          Add yourself, add your parents, and send one invitation. The rest arrives a relative at a
          time.
        </p>
        <Link href={CREATE} className="landing-cta landing-cta--inverted">
          Start a tree — free
        </Link>
        <p className="landing-close-alt">
          Already keeping one? <Link href="/signin">Sign in</Link>
        </p>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <span className="mark">Vanshavali</span>
          <span className="deva">वंशावली</span>
        </div>
        <div className="landing-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/privacy">Terms</Link>
          <Link href="/signin">Export your data</Link>
          <Link href="/about">Contact</Link>
        </div>
        <div className="landing-footer-made">Made in Mithila · MIT licensed</div>
      </footer>
    </div>
  );
}
