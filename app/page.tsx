"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Languages,
  Laptop,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { FormFeedback } from "@/components/form-feedback";

const slides = [
  {
    image: "/hero-al-hidaya-exterior.webp",
    eyebrow: "Al-Hidaya Islamic Centre · Bolton",
    title: "Faith. Knowledge. Skills for every generation.",
    text: "Qur’anic education, Islamic and Arabic studies, and practical learning support for children, adults and families.",
  },
  {
    image: "/hero-mosque-interior.jpg",
    eyebrow: "Adult Qur’an learning",
    title: "Begin, return or go deeper with the Qur’an.",
    text: "Welcoming learning pathways for men and women in recitation, Tajweed and Hifz — from first steps to confident progress.",
  },
  {
    image: "/hero-calligraphy.jpg",
    eyebrow: "Learning for life",
    title: "Islamic roots. Academic confidence. Digital skills.",
    text: "A community learning hub where traditional knowledge and practical education help every learner move forward.",
  },
];

const pathways = [
  {
    number: "01",
    icon: BookOpen,
    eyebrow: "Children & young learners",
    title: "Children’s Madrasah",
    text: "A balanced foundation in Qur’an, Arabic, Islamic Studies and character for school-age learners.",
    href: "#children-madrasah",
    accent: "gold",
  },
  {
    number: "02",
    icon: Users,
    eyebrow: "Men & women",
    title: "Adult Qur’an Classes",
    text: "Supportive recitation, Tajweed and memorisation pathways designed around adult learners.",
    href: "#adult-classes",
    accent: "ink",
  },
  {
    number: "03",
    icon: GraduationCap,
    eyebrow: "Community support",
    title: "Academic & Digital Skills",
    text: "SATs and GCSE support, practical English, and IT or Computer Science learning in the heart of Bolton.",
    href: "#community-learning",
    accent: "cream",
  },
];

const learningTracks = {
  "Qur’an": {
    description: "Build accurate recitation, confidence and a lasting relationship with the Book of Allah.",
    courses: ["Qur’an Recitation", "Tajweed", "Hifz & Revision", "Ten Qira’at"],
  },
  Arabic: {
    description: "Move from recognising letters to reading, writing and engaging with Arabic texts.",
    courses: ["Arabic Reading", "Arabic Writing", "Vocabulary Foundations", "Qur’anic Arabic"],
  },
  "Islamic Studies": {
    description: "Study the foundations of faith and connect sacred knowledge with everyday life.",
    courses: ["Hadith Studies", "Tawhid", "Seerah", "Tafseer"],
  },
};

const programmeOptions = [
  "Children’s Madrasah",
  "Qur’an Foundation",
  "Qur’an Recitation & Tajweed",
  "Adult Hifz",
  "Ten Qira’at",
  "Arabic Reading & Writing",
  "Qur’anic Arabic",
  "Hadith Studies",
  "Tawhid, Seerah & Tafseer",
  "SATs Support",
  "GCSE Tutorials",
  "English Speaking & Writing",
  "IT & Computer Science Skills",
];

export default function PublicHome() {
  const [slide, setSlide] = useState(0);
  const [menu, setMenu] = useState(false);
  const [apply, setApply] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState(programmeOptions[0]);
  const [activeTrack, setActiveTrack] = useState<keyof typeof learningTracks>("Qur’an");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [applicationReference, setApplicationReference] = useState("");
  const [emailStatus, setEmailStatus] = useState<"sent" | "not_configured" | "failed" | "">("");

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!applicationReference) return;
    const timer = window.setTimeout(() => {
      setApply(false);
      setApplicationReference("");
      setMessage("");
      setEmailStatus("");
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [applicationReference]);

  const current = slides[slide];
  const currentTrack = learningTracks[activeTrack];

  function openApplication(programme = programmeOptions[0]) {
    setSelectedProgramme(programme);
    setMessage("");
    setApplicationReference("");
    setEmailStatus("");
    setApply(true);
  }

  function closeApplication() {
    if (sending) return;
    setApply(false);
    setMessage("");
    setApplicationReference("");
    setEmailStatus("");
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setMessage("");
    try {
      const form = new FormData(formElement);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) as { id?: string; reference?: string; emailStatus?: "sent" | "not_configured" | "failed"; error?: string } : {};
      if (!response.ok) {
        setMessage(result.error || "We could not submit your interest. Please try again.");
        return;
      }
      formElement.reset();
      setEmailStatus(result.emailStatus || "failed");
      setApplicationReference(result.reference || `AHM-${result.id?.replaceAll("-", "").slice(0, 8).toUpperCase() || "RECEIVED"}`);
    } catch {
      setMessage("We could not submit your interest. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="public-site">
      <div className="public-top">
        <span><MapPin size={14} />66 Chorley Street, Bolton BL1 4AL</span>
        <span><Phone size={14} />+44 7507 703182</span>
        <a href="/portal">Portal access <ArrowRight size={14} /></a>
      </div>

      <nav className="public-nav" aria-label="Main navigation">
        <a className="public-brand" href="#home" aria-label="Al-Hidaya Islamic Centre home">
          <img src="/al-hidaya-logo.png" alt="Al-Hidaya Islamic Centre" />
          <div><strong>Al-Hidaya</strong><span>Learning & Community · Bolton</span></div>
        </a>
        <button className="public-menu" onClick={() => setMenu((value) => !value)} aria-label="Toggle navigation">
          {menu ? <X /> : <Menu />}
        </button>
        <div className={menu ? "public-links open" : "public-links"}>
          <a href="#pathways" onClick={() => setMenu(false)}>Learning</a>
          <a href="#adult-classes" onClick={() => setMenu(false)}>Adult classes</a>
          <a href="#islamic-arabic" onClick={() => setMenu(false)}>Islamic & Arabic</a>
          <a href="#community-learning" onClick={() => setMenu(false)}>Academic & Digital</a>
          <a className="portal-link" href="/portal">Portal</a>
          <button onClick={() => { openApplication(); setMenu(false); }}>Register interest</button>
        </div>
      </nav>

      <section
        id="home"
        className="public-hero"
        style={{ backgroundImage: `linear-gradient(90deg,rgba(11,11,10,.94) 0%,rgba(11,11,10,.69) 47%,rgba(11,11,10,.17) 100%),url(${current.image})` }}
      >
        <div className="hero-copy" key={current.title}>
          <span className="hero-eyebrow">{current.eyebrow}</span>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
          <div className="hero-actions">
            <a className="hero-primary" href="#pathways">Explore learning <ArrowRight size={17} /></a>
            <button onClick={() => openApplication()}>Register your interest</button>
          </div>
        </div>
        <div className="hero-mark" aria-hidden="true"><span>ٱقْرَأْ</span><small>Read · Learn · Grow</small></div>
        <button className="slide-arrow left" onClick={() => setSlide((slide + slides.length - 1) % slides.length)} aria-label="Previous slide"><ChevronLeft /></button>
        <button className="slide-arrow right" onClick={() => setSlide((slide + 1) % slides.length)} aria-label="Next slide"><ChevronRight /></button>
        <div className="slide-dots">{slides.map((_, index) => <button key={index} className={index === slide ? "active" : ""} onClick={() => setSlide(index)} aria-label={`Show slide ${index + 1}`} />)}</div>
      </section>

      <section className="public-intro section-wrap" aria-labelledby="intro-title">
        <span className="section-kicker">One centre. A lifetime of learning.</span>
        <div className="intro-grid">
          <h2 id="intro-title">Rooted in revelation.<br />Ready for the world.</h2>
          <div>
            <p>Al-Hidaya is growing from a children’s Madrasah into a wider learning home for the Muslim community — bringing Qur’anic, Islamic, Arabic, academic and digital education together with clarity and purpose.</p>
            <a href="#pathways">Find your pathway <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>

      <section id="pathways" className="pathways-section">
        <div className="section-wrap">
          <div className="section-title">
            <div><span className="section-kicker">Choose your pathway</span><h2>Learning for every stage of life.</h2></div>
            <p>Explore focused programmes for young people, adults, and the wider Bolton community.</p>
          </div>
          <div className="pathway-grid">
            {pathways.map(({ number, icon: Icon, eyebrow, title, text, href, accent }) => (
              <a className={`pathway-card ${accent}`} href={href} key={title}>
                <span className="pathway-number">{number}</span>
                <Icon />
                <small>{eyebrow}</small>
                <h3>{title}</h3>
                <p>{text}</p>
                <b>Explore pathway <ArrowRight size={16} /></b>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="islamic-arabic" className="curriculum section-wrap">
        <div className="curriculum-heading">
          <div>
            <span className="section-kicker">Islamic & Arabic Studies</span>
            <h2>A connected curriculum for sacred learning.</h2>
          </div>
          <p>Start with the subject you need today, while seeing how each area connects to a richer understanding of Islam.</p>
        </div>
        <div className="curriculum-shell">
          <div className="curriculum-tabs" role="tablist" aria-label="Study areas">
            {(Object.keys(learningTracks) as (keyof typeof learningTracks)[]).map((track) => (
              <button key={track} className={activeTrack === track ? "active" : ""} onClick={() => setActiveTrack(track)} role="tab" aria-selected={activeTrack === track}>{track}</button>
            ))}
          </div>
          <div className="curriculum-panel" role="tabpanel">
            <div className="curriculum-copy">
              <span>{activeTrack === "Qur’an" ? <BookOpen /> : activeTrack === "Arabic" ? <Languages /> : <Sparkles />}</span>
              <h3>{activeTrack}</h3>
              <p>{currentTrack.description}</p>
            </div>
            <div className="course-list">
              {currentTrack.courses.map((course, index) => (
                <button key={course} onClick={() => openApplication(course)}>
                  <span>0{index + 1}</span><strong>{course}</strong><ArrowRight />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="adult-classes" className="adult-section">
        <div className="adult-photo" role="img" aria-label="Mosque interior"><div><span>For men & women</span><strong>Flexible pathways for adult learners</strong></div></div>
        <div className="adult-copy">
          <span className="section-kicker">Adult Qur’an Classes</span>
          <h2>Your Qur’an journey can begin at any age.</h2>
          <p>Whether you are learning for the first time, returning after a break, or ready to strengthen memorisation, our adult pathway is designed to help you move forward with confidence.</p>
          <div className="adult-options">
            <button onClick={() => openApplication("Qur’an Recitation & Tajweed")}><BookOpen /><span><strong>Recitation & Tajweed</strong><small>Develop fluency and correct pronunciation at your level.</small></span><ArrowRight /></button>
            <button onClick={() => openApplication("Adult Hifz")}><Sparkles /><span><strong>Hifz & Revision</strong><small>Build a consistent memorisation and review routine.</small></span><ArrowRight /></button>
          </div>
          <p className="adult-note"><Users size={18} /> Separate learning options for men and women, subject to programme availability.</p>
        </div>
      </section>

      <section id="children-madrasah" className="young-section section-wrap">
        <div className="young-copy">
          <span className="section-kicker">Children & young learners</span>
          <h2>Strong foundations, beautiful character.</h2>
          <p>Our established Madrasah pathway remains at the heart of Al-Hidaya: helping children grow in Qur’an, Arabic, Islamic understanding and adab in a safe, structured setting.</p>
          <ul>
            <li><CheckCircle2 /> Qur’an reading, memorisation and Tajweed</li>
            <li><CheckCircle2 /> Arabic foundations and Islamic Studies</li>
            <li><CheckCircle2 /> Character, confidence and community</li>
          </ul>
          <button onClick={() => openApplication("Children’s Madrasah")}>Enquire about the Madrasah <ArrowRight /></button>
        </div>
        <div className="young-visual">
          <img src="/hero-calligraphy.jpg" alt="Islamic calligraphy and mosque architecture" />
          <blockquote>“My Lord, increase me in knowledge.”<cite>Qur’an 20:114</cite></blockquote>
        </div>
      </section>

      <section id="community-learning" className="community-section">
        <div className="section-wrap">
          <div className="community-head">
            <div><span className="section-kicker">Academic & Digital Support</span><h2>Practical skills. Brighter futures.</h2></div>
            <p>Community learning designed to support school progress, everyday confidence and access to the digital world.</p>
          </div>
          <div className="community-grid">
            <article><span><GraduationCap /></span><small>School support</small><h3>SATs & GCSE Tutorials</h3><p>Focused support to strengthen understanding, study habits and exam confidence.</p><button onClick={() => openApplication("SATs Support")}>Register interest <ArrowRight /></button></article>
            <article><span><Languages /></span><small>Everyday confidence</small><h3>English Speaking & Writing</h3><p>Practical language learning for communication, work, study and daily life.</p><button onClick={() => openApplication("English Speaking & Writing")}>Register interest <ArrowRight /></button></article>
            <article><span><Laptop /></span><small>Digital opportunity</small><h3>IT & Computer Science</h3><p>Accessible digital skills and computing foundations for learners at different stages.</p><button onClick={() => openApplication("IT & Computer Science Skills")}>Register interest <ArrowRight /></button></article>
          </div>
          <div className="community-note"><HeartHandshake /><span><strong>Help shape the programme.</strong> Register your interest to tell us what you or your family would benefit from most.</span><button onClick={() => openApplication("GCSE Tutorials")}>Tell us what you need</button></div>
        </div>
      </section>

      <section className="why-section section-wrap">
        <div><span className="section-kicker">The Al-Hidaya approach</span><h2>Knowledge with purpose. Learning with care.</h2></div>
        <div className="why-grid">
          <article><ShieldCheck /><h3>Safe & welcoming</h3><p>Learning shaped around safeguarding, dignity and a strong sense of belonging.</p></article>
          <article><Clock3 /><h3>Built for real life</h3><p>Clear pathways and flexible formats developed around community needs.</p></article>
          <article><Users /><h3>One community</h3><p>Children, adults and families learning and progressing together in Bolton.</p></article>
        </div>
      </section>

      <section className="portal-banner">
        <div><span className="section-kicker">Already learning with us?</span><h2>Your Al-Hidaya portal.</h2><p>One secure place for administrators, teachers and families to access the information relevant to them.</p></div>
        <a href="/portal"><span><ShieldCheck /><small>Secure access</small><strong>Open the Madrasah portal</strong></span><ArrowRight /></a>
      </section>

      <section id="contact" className="contact section-wrap">
        <div><span className="section-kicker">Visit Al-Hidaya</span><h2>Find your next step.</h2><p>Speak with the team about children’s Madrasah, adult Qur’an learning, Islamic and Arabic Studies, or community skills programmes.</p></div>
        <div className="contact-card">
          <p><MapPin />66 Chorley Street<br />Bolton BL1 4AL</p>
          <p><Phone />+44 7507 703182</p>
          <a href="mailto:alhidayatulummaha@gmail.com">alhidayatulummaha@gmail.com</a>
          <button onClick={() => openApplication()}>Register your interest</button>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-brand"><img src="/al-hidaya-logo.png" alt="Al-Hidaya Islamic Centre" /><p>Faith, knowledge and practical learning for every generation in Bolton.</p></div>
        <div><strong>Learning</strong><a href="#children-madrasah">Children’s Madrasah</a><a href="#adult-classes">Adult classes</a><a href="#islamic-arabic">Islamic & Arabic</a><a href="#community-learning">Academic & Digital</a></div>
        <div><strong>Connect</strong><a href="#contact">Contact</a><a href="/portal">Portal access</a><span>66 Chorley Street</span><span>Bolton BL1 4AL</span></div>
        <small>© 2026 Al-Hidaya Islamic Centre · Designed by <a className="nuraspecs-link" href="https://www.nuraspecs.com/" target="_blank" rel="noopener noreferrer">NuraSpecs</a></small>
      </footer>

      {apply && (
        <div className="apply-backdrop" onMouseDown={closeApplication}>
          <div className={`apply-modal${applicationReference ? " application-confirmed" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="apply-close" onClick={closeApplication} disabled={sending} aria-label="Close registration window"><X /></button>
            {applicationReference ? (
              <div className="confirmation-panel" role="status">
                <span className="confirmation-check"><CheckCircle2 /></span>
                <span className="section-kicker">Interest received</span>
                <h2>JazakAllahu khayran</h2>
                <p>{emailStatus === "sent" ? "Your details have been submitted and a confirmation email has been sent to you." : "Your details have been submitted successfully. Please keep the reference below."}</p>
                <div className="application-reference"><span>Reference</span><strong>{applicationReference}</strong></div>
                <button className="confirmation-close" onClick={closeApplication}>Close</button>
                <small>This window will close automatically in 6 seconds.</small>
              </div>
            ) : (
              <>
                <span className="section-kicker">Admissions & new programmes</span>
                <h2>Register your interest</h2>
                <p>Tell us who the learning is for and which pathway interests you. The Al-Hidaya team will contact you about the next step.</p>
                <form onSubmit={submitApplication} onChange={() => message && setMessage("")}>
                  <label>Learner’s full name<input name="childName" autoComplete="name" required /></label>
                  <div><label>Date of birth<input name="dateOfBirth" type="date" required /></label><label>Gender<select name="gender" defaultValue="" required><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label></div>
                  <label>Programme of interest<select name="programme" defaultValue={selectedProgramme}>{programmeOptions.map((programme) => <option key={programme}>{programme}</option>)}</select></label>
                  <label>Parent, guardian or learner name<input name="guardianName" autoComplete="name" required /></label>
                  <div><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Telephone<input name="phone" type="tel" autoComplete="tel" required /></label></div>
                  <label>Home address<textarea name="address" rows={2} autoComplete="street-address" required /></label>
                  <label>Postcode<input name="postcode" autoComplete="postal-code" required /></label>
                  <label>Tell us what support you need<textarea name="notes" rows={3} /></label>
                  <FormFeedback message={message} />
                  <button disabled={sending}>{sending ? "Submitting…" : "Submit interest"}</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
