"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, HeartHandshake, MapPin, Menu, Phone, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { FormFeedback } from "@/components/form-feedback";

const slides = [
  { image: "/hero-al-hidaya-exterior.webp", kind: "photo", eyebrow: "Welcome to Al-Hidaya", title: "Guidance, knowledge and character", text: "A caring madrasat community helping every child grow in Qur’an, Islamic knowledge and good conduct." },
  { image: "/hero-mosque-interior.jpg", kind: "photo", eyebrow: "A place to belong", title: "Learning rooted in faith", text: "Structured Islamic education, attentive teachers and a safe environment for children and families in Bolton." },
  { image: "/hero-calligraphy.jpg", kind: "photo", eyebrow: "Nurturing young Muslims", title: "Beautiful knowledge, lasting values", text: "Supporting learners to recite, understand and live by the guidance of Islam with confidence." }
];

const programmes = [
  { icon: BookOpen, title: "Qur’an & Tajweed", text: "Step-by-step recitation, memorisation and tajweed for every ability." },
  { icon: Sparkles, title: "Islamic Studies", text: "Age-appropriate learning that connects faith with everyday character." },
  { icon: GraduationCap, title: "Arabic Foundation", text: "Building vocabulary, reading confidence and understanding of Arabic." },
  { icon: HeartHandshake, title: "Community & Character", text: "A welcoming environment centred on adab, service and belonging." }
];

export default function PublicHome() {
  const [slide, setSlide] = useState(0);
  const [menu, setMenu] = useState(false);
  const [apply, setApply] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [applicationReference, setApplicationReference] = useState("");
  const [emailStatus, setEmailStatus] = useState<"sent" | "not_configured" | "failed" | "">("");
  useEffect(() => { const timer = window.setInterval(() => setSlide(v => (v + 1) % slides.length), 6500); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!applicationReference) return;
    const timer = window.setTimeout(() => {
      setApply(false);
      setApplicationReference("");
      setMessage("");
      setEmailStatus("");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [applicationReference]);
  const current = slides[slide];

  function openApplication() {
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
    setSending(true); setMessage("");
    try {
      const form = new FormData(formElement);
      const response = await fetch("/api/applications", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json() as {id?:string;reference?:string;emailStatus?:"sent"|"not_configured"|"failed";error?:string};
      if (!response.ok) { setMessage(result.error || "We could not submit the application."); return; }
      formElement.reset();
      setEmailStatus(result.emailStatus || "failed");
      setApplicationReference(result.reference || `AHM-${result.id?.replaceAll("-", "").slice(0, 8).toUpperCase() || "RECEIVED"}`);
    } catch {
      setMessage("We could not submit the application. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return <div className="public-site">
    <div className="public-top"><span><MapPin size={14}/>66 Chorley Street, Bolton BL1 4AL</span><span><Phone size={14}/>+44 7507 703182</span><a href="/portal">Madrasat portal <ArrowRight size={14}/></a></div>
    <nav className="public-nav"><a className="public-brand" href="#home"><img src="/al-hidaya-logo.png" alt="Al-Hidaya Islamic Centre"/><div><strong>Al-Hidaya</strong><span>Islamic Centre · Bolton</span></div></a><button className="public-menu" onClick={() => setMenu(v=>!v)} aria-label="Toggle navigation">{menu?<X/>:<Menu/>}</button><div className={menu?"public-links open":"public-links"}><a href="#about" onClick={()=>setMenu(false)}>About</a><a href="#programmes" onClick={()=>setMenu(false)}>Madrasat</a><a href="#values" onClick={()=>setMenu(false)}>Our values</a><a href="#contact" onClick={()=>setMenu(false)}>Contact</a><button onClick={()=>{openApplication();setMenu(false)}}>Apply now</button><a className="portal-link" href="/portal">Portal access</a></div></nav>

    <section id="home" className={`public-hero ${current.kind}`} style={current.kind==="photo"?{backgroundImage:`linear-gradient(90deg,rgba(10,12,10,.91),rgba(10,12,10,.32)),url(${current.image})`}:undefined}>
      {current.kind==="brand"&&<div className="hero-brand-art"><div className="gold-orbit"/><img src={current.image} alt="Al-Hidaya Islamic Centre logo"/></div>}
      <div className="hero-copy"><span className="hero-eyebrow">{current.eyebrow}</span><h1>{current.title}</h1><p>{current.text}</p><div className="hero-actions"><button onClick={openApplication}>Apply for a place <ArrowRight size={17}/></button><a href="/portal">Access the portal</a></div></div>
      <button className="slide-arrow left" onClick={()=>setSlide((slide+slides.length-1)%slides.length)} aria-label="Previous slide"><ChevronLeft/></button><button className="slide-arrow right" onClick={()=>setSlide((slide+1)%slides.length)} aria-label="Next slide"><ChevronRight/></button><div className="slide-dots">{slides.map((_,i)=><button key={i} className={i===slide?"active":""} onClick={()=>setSlide(i)} aria-label={`Show slide ${i+1}`}/>)}</div>
    </section>

    <section className="public-highlights"><div><strong>Safe & nurturing</strong><span>Safeguarding-led learning</span></div><div><strong>Structured curriculum</strong><span>Clear learning progression</span></div><div><strong>Family connected</strong><span>Updates through the portal</span></div><div><strong>Bolton community</strong><span>Learning, faith and belonging</span></div></section>

    <section id="about" className="public-about section-wrap"><div className="section-kicker">Our madrasat</div><div className="about-grid"><div><h2>Helping children learn Islam with love and confidence.</h2></div><div><p>Al-Hidaya Madrasat provides a warm, organised environment where children can develop Qur’anic fluency, Islamic understanding and excellent character.</p><p>Our new digital system keeps families connected with applications, attendance, learning progress, fees and important announcements.</p><a href="#programmes">Explore our learning <ArrowRight size={16}/></a></div></div></section>

    <section id="programmes" className="programmes"><div className="section-wrap"><div className="section-title"><div><span className="section-kicker">Learning pathways</span><h2>A balanced Islamic education</h2></div><p>Programmes designed to support learners from their first Arabic letters through confident recitation and deeper Islamic understanding.</p></div><div className="programme-grid">{programmes.map(({icon:Icon,title,text},i)=><article key={title}><span>0{i+1}</span><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section id="values" className="values section-wrap"><div className="value-photo"><img src="/hero-calligraphy.jpg" alt="Islamic calligraphy and mosque architecture"/><div><span>بِسْمِ ٱللَّٰهِ</span><p>Begin with purpose. Learn with humility. Grow with good character.</p></div></div><div className="value-copy"><span className="section-kicker">What matters to us</span><h2>Learning, safety and community.</h2><div className="value-list"><div><ShieldCheck/><p><strong>Safeguarding first</strong><span>Clear processes, responsible adults and secure collection arrangements.</span></p></div><div><Users/><p><strong>Parents as partners</strong><span>Simple access to progress, attendance, fees and announcements.</span></p></div><div><CheckCircle2/><p><strong>Progress that is visible</strong><span>Consistent learning goals and meaningful feedback for every child.</span></p></div></div></div></section>

    <section className="portal-banner"><div><span className="section-kicker">One connected community</span><h2>Your madrasat, always within reach.</h2><p>Administrators, teachers and families can securely manage the information relevant to them.</p></div><div className="portal-cards"><a href="/portal"><Users/><strong>Parent & guardian</strong><span>Attendance, progress, fees and messages</span><ArrowRight/></a><a href="/portal"><ShieldCheck/><strong>Staff & administration</strong><span>Students, classes, compliance and reporting</span><ArrowRight/></a></div></section>

    <section id="contact" className="contact section-wrap"><div><span className="section-kicker">Visit Al-Hidaya</span><h2>We would love to welcome your family.</h2><p>Speak with the madrasat team about classes, admissions or volunteering.</p></div><div className="contact-card"><p><MapPin/>66 Chorley Street<br/>Bolton BL1 4AL</p><p><Phone/>+44 7507 703182</p><a href="mailto:alhidayatulummaha@gmail.com">alhidayatulummaha@gmail.com</a><button onClick={openApplication}>Start an application</button></div></section>

    <footer className="public-footer"><div><img src="/al-hidaya-logo.png" alt=""/><p>Guidance, knowledge and community in the heart of Bolton.</p></div><div><strong>Quick links</strong><a href="#about">About</a><a href="#programmes">Madrasat</a><a href="/portal">Portal access</a></div><div><strong>Contact</strong><span>66 Chorley Street</span><span>Bolton BL1 4AL</span><span>+44 7507 703182</span><span>Photography: Slava Arkhipenko & Yaren Kılıç / Unsplash</span></div><small>© 2026 Al-Hidaya Islamic Centre · Designed and delivered by <b>NuraSpecs</b></small></footer>

    {apply&&<div className="apply-backdrop"><div className={`apply-modal${applicationReference ? " application-confirmed" : ""}`} onMouseDown={e=>e.stopPropagation()}><button className="apply-close" onClick={closeApplication} disabled={sending} aria-label="Close admissions window"><X/></button>{applicationReference ? <div className="confirmation-panel" role="status"><span className="confirmation-check"><CheckCircle2/></span><span className="section-kicker">Application received</span><h2>JazakAllahu khayran</h2><p>{emailStatus==="sent" ? "Your application has been submitted and a confirmation email has been sent to you." : "Your application has been submitted successfully. We could not send the email receipt, so please keep the reference below."}</p><div className="application-reference"><span>Application reference</span><strong>{applicationReference}</strong></div><button className="confirmation-close" onClick={closeApplication}>Close</button><small>This window will close automatically in 5 seconds.</small></div> : <><span className="section-kicker">Admissions</span><h2>Apply to Al-Hidaya Madrasat</h2><p>Complete the short form and the madrasat team will contact you.</p><form onSubmit={submitApplication} onChange={()=>message&&setMessage("")}><label>Child’s full name<input name="childName" autoComplete="name" required/></label><div><label>Date of birth<input name="dateOfBirth" type="date" required/></label><label>Gender<select name="gender" defaultValue="" required><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label></div><label>Requested programme<select name="programme"><option>Qur’an Foundation</option><option>Qur’an & Tajweed</option><option>Hifz Programme</option><option>Arabic Foundation</option><option>Islamic Studies</option></select></label><label>Parent or guardian name<input name="guardianName" autoComplete="name" required/></label><div><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Telephone<input name="phone" type="tel" autoComplete="tel" required/></label></div><label>Home address<textarea name="address" rows={2} autoComplete="street-address" required/></label><label>Postcode<input name="postcode" autoComplete="postal-code" required/></label><label>Anything we should know?<textarea name="notes" rows={3}/></label><FormFeedback message={message}/><button disabled={sending}>{sending?"Submitting application…":"Submit application"}</button></form></>}</div></div>}
  </div>;
}
