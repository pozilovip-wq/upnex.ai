import { useState, useEffect, useRef, useCallback } from 'react'
import logo from './IMG_4167.JPG'
import oyatilloImage from './oyatillo_new.jpg'
import nurislomImage from './IMG_5404.JPG'
import UniversitiesSection from './UniversitiesSection.jsx'
import universitiesData from './universities.js'
import HeroHeadline from './HeroHeadline.jsx'
import { useReveal } from './useReveal.js'

const TELEGRAM = 'https://t.me/upnex_admin'

function telegramLink(message) {
  return `${TELEGRAM}?text=${encodeURIComponent(message)}`
}

/* ─── FULL-PAGE PARALLAX HOOK ─── */
// Any element with data-parallax="0.15" will move at 15% of scroll speed
// relative to its section's scroll position (not global scroll).
function useParallax() {
  useEffect(() => {
    let raf = null

    function update() {
      const scrollY = window.scrollY

      // 1. Hero orbs — global parallax (they only exist in hero)
      const orb1   = document.getElementById('para-orb1')
      const orb2   = document.getElementById('para-orb2')
      const orb3   = document.getElementById('para-orb3')
      const photo  = document.getElementById('para-photo')
      const heroBg = document.getElementById('para-herobg')
      if (orb1)   orb1.style.transform   = `translateY(${scrollY * 0.18}px)`
      if (orb2)   orb2.style.transform   = `translateY(${scrollY * 0.12}px)`
      if (orb3)   orb3.style.transform   = `translateY(${scrollY * 0.22}px)`
      if (photo)  photo.style.transform  = `translateY(${scrollY * 0.07}px)`
      if (heroBg) heroBg.style.transform = `translateY(${scrollY * 0.04}px)`

      // 2. Section-relative parallax — elements with [data-parallax]
      const els = document.querySelectorAll('[data-parallax]')
      els.forEach((el) => {
        const rate   = parseFloat(el.dataset.parallax) || 0.1
        const rect   = el.parentElement
          ? el.parentElement.getBoundingClientRect()
          : el.getBoundingClientRect()
        const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2
        el.style.transform = `translateY(${centerOffset * rate}px)`
      })

      raf = null
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update)
    }

    // Run once immediately so nothing jumps on first scroll
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

/* ─── SCROLL PROGRESS BAR ─── */
function useScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById('scroll-progress')
    if (!bar) return
    const onScroll = () => {
      const scrolled = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}

/* ─── ANIMATED COUNTER ─── */
function useCounter(target, duration = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const num = parseInt(target.replace(/\D/g, ''), 10)
        if (!num) { setValue(target); return }
        let start = 0
        const step = Math.ceil(num / (duration / 16))
        const timer = setInterval(() => {
          start += step
          if (start >= num) {
            setValue(num)
            clearInterval(timer)
          } else {
            setValue(start)
          }
        }, 16)
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return { ref, value }
}

/* ─── STAT COUNTER ITEM ─── */
function StatCounter({ stat, label, index }) {
  const num = parseInt(stat.replace(/\D/g, ''), 10)
  const suffix = stat.replace(/[\d,]/g, '')
  const { ref, value } = useCounter(stat)

  return (
    <div
      ref={ref}
      className={`reveal reveal-delay-${index + 1} card-lift rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl`}
    >
      <h3 className="text-2xl font-bold tabular-nums">
        {num ? `${value.toLocaleString()}${suffix}` : stat}
      </h3>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  )
}

/* ─── COUNTRY DETAILS DATA ─── */
const countryDetails = {
  USA: {
    flag: '🇺🇸',
    tagline: 'Your Path to Studying in America Starts Here',
    about: 'Study in the United States with personalized support from UPNEX. We help students find affordable universities, secure scholarships, complete applications, and prepare for their student visa journey. Many partner universities offer admission pathways without IELTS or SAT requirements.',
    infoCards: [
      { label: 'Visa', value: 'F-1 Student Visa' },
      { label: 'Scholarships', value: 'Merit Scholarships — Up to $35,000+ / year' },
      { label: 'English Test', value: 'IELTS, Duolingo, TOEFL Accepted' },
      { label: 'Work Opportunities', value: 'Up to 20 hrs/week on campus' },
    ],
    services: [
      'University matching based on your GPA and budget',
      'Scholarship application assistance',
      'Application and admission support',
      'Student visa preparation',
      'Embassy interview coaching',
      'Accommodation assistance',
      'Pre-departure guidance',
      'Post-arrival support',
    ],
    whyStudy: [
      "🎓 Home to many of the world's top-ranked universities",
      '💰 Generous merit scholarships available for international students',
      '💼 On-campus work opportunities during studies',
      '🌍 Diverse and multicultural campus environments',
      '📈 Strong career and internship opportunities',
      '🏙 Campuses in major cities including New York',
    ],
    keyFacts: [
      { label: 'Intakes', value: 'Fall (September) · Spring (January)' },
      { label: 'Tuition', value: 'From $15,000 – $55,000 / year' },
      { label: 'Living Costs', value: 'Varies by state and city' },
      { label: 'After Graduation', value: 'OPT — Work up to 3 years post-graduation' },
    ],
    universities: ['Hartwick College', 'Pace University', 'Monroe University'],
  },
  UK: {
    flag: '🇬🇧',
    tagline: 'Study at Top UK Universities with Scholarships',
    about: "The United Kingdom is home to some of the world's most respected universities. UPNEX helps students apply to UK universities, explore scholarship opportunities, and navigate the student visa process with confidence. Many universities offer flexible English language options and multiple intakes throughout the year.",
    infoCards: [
      { label: 'Visa', value: 'UK Student Visa' },
      { label: 'Scholarships', value: 'Up to £10,000+ / year' },
      { label: 'English Requirements', value: 'Flexible English Language Options' },
      { label: 'Work Opportunities', value: 'Up to 20 hrs/week during studies' },
    ],
    services: [
      'University selection based on your GPA and budget',
      'Scholarship application assistance',
      'Application and admission support',
      'Student visa guidance',
      'CAS and document preparation support',
      'Accommodation assistance',
      'Pre-departure guidance',
      'Post-arrival support',
    ],
    whyStudy: [
      '🎓 World-renowned universities',
      '📅 September and January intakes',
      "⏱ Bachelor's degrees typically completed in 3 years",
      "🎯 Master's degrees often completed in 1 year",
      '💼 Part-time work opportunities while studying',
      '🌍 Graduate Route visa available after graduation',
    ],
    keyFacts: [
      { label: 'Degree Duration', value: "Bachelor's: 3 Years · Master's: 1 Year" },
      { label: 'Average Tuition', value: '£10,000 – £25,000 / year' },
      { label: 'Living Costs', value: '£800 – £1,500 / month (varies by city)' },
      { label: 'After Graduation', value: 'Graduate Route — Stay & work in the UK' },
    ],
    universities: ['University of Hertfordshire', 'University of Chester', 'De Montfort University', 'University of East London', 'Middlesex University'],
  },
  Canada: {
    flag: '🇨🇦',
    tagline: 'Affordable Education & Pathways to a Global Career',
    about: 'Canada is one of the most popular destinations for international students thanks to its high-quality education, welcoming environment, and excellent career opportunities. UPNEX helps students find affordable universities, apply for scholarships, and navigate the study permit process from start to finish.',
    infoCards: [
      { label: 'Study Permit', value: 'Canadian Study Permit' },
      { label: 'Scholarships', value: 'Scholarships Available' },
      { label: 'English Requirements', value: 'Flexible English Language Options' },
      { label: 'Work Opportunities', value: 'Work While You Study' },
    ],
    services: [
      'University selection based on GPA and budget',
      'Scholarship application assistance',
      'Application and admission support',
      'Study permit guidance',
      'Financial document preparation support',
      'Accommodation assistance',
      'Pre-departure guidance',
      'Post-arrival support',
    ],
    whyStudy: [
      '🎓 High-quality education recognized worldwide',
      '🌍 Safe and welcoming environment',
      '💼 Work opportunities during studies',
      '🏫 Affordable university and college options',
      '📈 Strong career opportunities after graduation',
      '🍁 Multicultural communities across the country',
    ],
    keyFacts: [
      { label: 'Intakes', value: 'Fall (Sep) · Winter (Jan) · Summer (May)' },
      { label: 'Tuition', value: 'Affordable options available across Canada' },
      { label: 'Living Costs', value: 'Vary by province and city' },
      { label: 'After Graduation', value: 'Post-Graduation Work Permit (PGWP)' },
    ],
    universities: ['Seneca Polytechnic', 'Humber College', 'Algonquin College', 'Conestoga College'],
  },
  Australia: {
    flag: '🇦🇺',
    tagline: 'World-Class Education & Amazing Student Experience',
    about: 'Australia is a leading destination for international students, offering globally recognized degrees, modern campuses, and excellent career opportunities. UPNEX helps students choose the right university, secure scholarships, and complete the student visa process with confidence.',
    infoCards: [
      { label: 'Visa', value: 'Student Visa (Subclass 500)' },
      { label: 'Scholarships', value: 'Scholarships Available' },
      { label: 'English Requirements', value: 'Flexible English Language Options' },
      { label: 'Work Opportunities', value: 'Work While You Study' },
    ],
    services: [
      'University selection based on GPA and budget',
      'Scholarship application assistance',
      'Application and admission support',
      'Student visa guidance',
      'Document preparation support',
      'Accommodation assistance',
      'Pre-departure guidance',
      'Post-arrival support',
    ],
    whyStudy: [
      '🎓 Globally recognized universities',
      '🌏 Diverse and welcoming international community',
      '💼 Work opportunities during studies',
      '🏖 High quality of life and safe cities',
      '📈 Strong career opportunities after graduation',
      '🔬 Innovative and industry-focused education',
    ],
    keyFacts: [
      { label: 'Intakes', value: 'February · July · Additional intakes available' },
      { label: 'Tuition', value: 'Affordable and premium options available' },
      { label: 'Living Costs', value: 'Vary by city and lifestyle' },
      { label: 'After Graduation', value: 'Career & graduate work opportunities' },
    ],
    universities: ['RMIT University', 'Griffith University', 'University of Southern Queensland', 'Charles Darwin University'],
  },
}

/* ─── SERVICES DATA ─── */
const SERVICES = [
  { icon: '🎓', name: 'University Admissions', desc: 'We find the right university for your GPA and budget, and manage the entire application process on your behalf.' },
  { icon: '💰', name: 'Scholarship 80–100%', desc: 'We apply for merit scholarships covering 80% to 100% of tuition — without IELTS or SAT requirements.' },
  { icon: '🛂', name: 'Visa Preparation', desc: 'Complete F-1 visa file preparation including DS-160, financial documents, and all embassy paperwork.' },
  { icon: '🗣', name: 'Embassy Interview Coaching', desc: 'We coach every student for their English-language embassy interview so they walk in prepared and confident.' },
  { icon: '✍️', name: 'Motivation Letter & Essays', desc: 'Our team writes professional motivation letters, personal statements, and essays that strengthen your application.' },
  { icon: '📋', name: 'All Documents Covered', desc: 'Invitation letters, financial affidavits, transcript translations — we handle every document from start to finish.' },
  { icon: '💼', name: 'Financial Management', desc: 'We guide students on proof-of-funds requirements and help prepare all financial documents for visa and enrollment.' },
  { icon: '🤝', name: 'Post-Arrival Support', desc: 'Oyatillo personally meets students arriving in New York and supports them through their first days on campus.' },
]

/* ─── COUNTRY MODAL ─── */
function CountryModal({ selectedCountry, onClose }) {
  const country = countryDetails[selectedCountry]
  if (!country) return null

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-8"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-900 p-8 shadow-2xl"
        style={{ animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity:0; transform: scale(0.92) translateY(20px); }
            to   { opacity:1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white transition text-lg"
        >✕</button>

        <div className="text-5xl mb-3">{country.flag}</div>
        <h2 className="text-3xl font-bold">{selectedCountry}</h2>
        <p className="mt-1 text-blue-400 font-medium">{country.tagline}</p>
        <p className="mt-5 leading-8 text-slate-300 text-sm">{country.about}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {country.infoCards.map((card) => (
            <div key={card.label} className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-slate-400 mb-1">{card.label}</p>
              <p className="text-sm font-semibold leading-6">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-semibold mb-3">What UPNEX Does For You</h3>
          <ul className="space-y-2">
            {country.services.map((s) => (
              <li key={s} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 text-blue-400 font-bold">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-semibold mb-3">Why Study in {selectedCountry}?</h3>
          <ul className="space-y-2">
            {country.whyStudy.map((s) => (
              <li key={s} className="text-sm text-slate-300">{s}</li>
            ))}
          </ul>
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-semibold mb-3">Key Facts</h3>
          <div className="space-y-3">
            {country.keyFacts.map((f) => (
              <div key={f.label} className="flex justify-between border-b border-white/10 pb-3 text-sm">
                <span className="text-slate-400">{f.label}</span>
                <span className="text-right font-medium max-w-[55%]">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-semibold mb-3">Partner Universities</h3>
          <div className="flex flex-wrap gap-2">
            {country.universities.map((u) => (
              <span key={u} className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">{u}</span>
            ))}
          </div>
        </div>

        <a
          href={telegramLink(`Hello! I'm interested in studying in ${selectedCountry}. Can you help me?`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block w-full rounded-2xl bg-blue-600 py-4 text-center font-semibold transition hover:bg-blue-500"
        >
          Get Free Consultation for {selectedCountry} →
        </a>
      </div>
    </div>
  )
}

/* ─── MAIN APP ─── */
export default function App() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  useReveal()
  useScrollProgress()
  useParallax()

  return (
    <div className="min-h-screen bg-slate-950 text-white page-enter">

      {/* SCROLL PROGRESS */}
      <div id="scroll-progress" />

      {/* COUNTRY MODAL */}
      {selectedCountry && (
        <CountryModal selectedCountry={selectedCountry} onClose={() => setSelectedCountry(null)} />
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Upnex Logo" className="h-14 w-14 rounded-2xl object-cover" />
            <div>
              <h1 className="text-2xl font-bold tracking-wide">UPNEX</h1>
              <p className="text-xs text-slate-400">You Are Going To Be Next</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            {['Home','About','Services','Universities','Team','Contact'].map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="nav-link transition hover:text-white">{link}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Telegram
            </a>
            <a
              href={telegramLink('Hello! I would like a free consultation from Upnex.')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shine rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold transition hover:bg-blue-500"
            >
              Free Consultation
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="home" className="relative overflow-hidden border-b border-white/10">

        {/* Aurora background orbs — parallax */}
        <div id="para-herobg" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div id="para-orb1" className="aurora-orb-1 absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div id="para-orb2" className="aurora-orb-2 absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[100px]" />
          <div id="para-orb3" className="aurora-orb-3 absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-700/10 blur-[90px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex badge-pulse rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
              ✦ Trusted By Students In USA, UK, Canada &amp; Australia
            </div>

            <HeroHeadline />

            <p className="reveal mb-8 max-w-2xl text-lg leading-8 text-slate-300">
              Upnex helps students receive high scholarships in the USA, UK, Canada, and Australia. Many partner universities offer admission pathways without IELTS or SAT requirements.
            </p>

            <div className="reveal reveal-delay-2 flex flex-wrap gap-4">
              <a
                href={telegramLink('Hello! I would like to book a free consultation with Upnex.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shine rounded-full bg-blue-600 px-7 py-4 text-sm font-semibold transition hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                Book Free Consultation
              </a>
              <a
                href="#universities"
                className="rounded-full border border-white/20 px-7 py-4 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-slate-950"
              >
                Explore Universities
              </a>
            </div>

            {/* Stats with animated counters */}
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { stat: '500+', label: 'Students Guided' },
                { stat: '100%', label: 'Scholarship Opportunities' },
                { stat: '4', label: 'Countries Covered' },
                { stat: '2', label: 'Offices: NY + UZ' },
              ].map(({ stat, label }, i) => (
                <StatCounter key={label} stat={stat} label={label} index={i} />
              ))}
            </div>
          </div>

          {/* Floating photo — parallax */}
          <div id="para-photo" className="reveal-right float-anim overflow-hidden rounded-[36px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <img src={oyatilloImage} alt="Oyatillo" className="h-[650px] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* ── COUNTRIES ── */}
      <section id="about" className="relative mx-auto max-w-7xl px-6 py-24 overflow-hidden">
        {/* background glow */}
        <div data-parallax="0.08" className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-blue-700/8 blur-[100px]" />
        <div className="mb-12 text-center">
          <p data-parallax="-0.06" className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400 label-animate">Countries</p>
          <h2 data-parallax="-0.04" className="reveal text-4xl font-bold">Study In Top Countries</h2>
          <p className="reveal reveal-delay-1 mt-4 text-slate-400">Click any country to see full details and how UPNEX can help you.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(countryDetails).map(([name, data], i) => (
            <button
              key={name}
              onClick={() => setSelectedCountry(name)}
              className={`reveal-scale reveal-delay-${i + 1} glow-card rounded-[28px] border border-white/10 bg-white/5 p-8 text-left cursor-pointer`}
            >
              <div className="mb-5 text-5xl">{data.flag}</div>
              <h3 className="text-2xl font-semibold">{name}</h3>
              <p className="mt-4 leading-7 text-slate-400 text-sm">{data.tagline}</p>
              <p className="mt-5 text-sm text-blue-400 font-medium">Learn more →</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── ABOUT UPNEX ── */}
      <section className="relative bg-slate-900/40 py-24 overflow-hidden">
        <div data-parallax="0.10" className="pointer-events-none absolute -left-60 top-1/2 h-[600px] w-[600px] rounded-full bg-indigo-700/8 blur-[120px]" />
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p data-parallax="-0.06" className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">About Us</p>
            <h2 data-parallax="-0.04" className="reveal text-4xl font-bold">Why Upnex Is Different</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3 mb-12">
            {[
              { icon: '🏆', title: 'The Only Agency in the Valley', body: 'Upnex is one of the very few consulting agencies in Uzbekistan that gets students into US universities without any certificates — no IELTS, no SAT required. For the USA, only a passport and school grades (attestat) are needed.', highlight: 'without any certificates' },
              { icon: '📄', title: 'Official Contract With Every Client', body: 'Upnex works with full transparency. Every new client signs an official contract before any work begins. We are accountable for every step — from application to visa — and you are protected throughout the process.' },
              { icon: '📅', title: 'Founded August 19', body: 'Since its founding on August 19, Upnex has helped dozens of students successfully receive US student visas and begin studying abroad. We have offices in both Tashkent, Uzbekistan and operate with a consultant based in New York, USA.' },
            ].map(({ icon, title, body }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} glow-card rounded-[28px] border border-white/10 bg-slate-950/70 p-8`}>
                <div className="mb-4 text-4xl">{icon}</div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-slate-400 leading-7 text-sm">{body}</p>
              </div>
            ))}
          </div>

          {/* Who can apply */}
          <div className="reveal rounded-[28px] border border-blue-500/20 bg-blue-500/5 p-8 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Who Can Apply With Upnex?</h3>
                <p className="text-slate-300 leading-8 mb-6">
                  If you have finished or are finishing <span className="text-white font-semibold">11th grade</span>, you are ready to work with Upnex. No IELTS, no SAT, no extra certificates needed.
                </p>
                <ul className="space-y-3">
                  {[
                    '✅ Passport + school certificate (attestat) is enough for USA',
                    '✅ 80% to 100% scholarships available',
                    '✅ Official contract signed with every student',
                    '✅ All documents prepared by the Upnex team',
                    '✅ Embassy interview coaching included',
                    '✅ Support until you land at your university',
                  ].map((item) => (
                    <li key={item} className="text-sm text-slate-300">{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Important Note</p>
                  <p className="text-sm text-slate-300 leading-7">
                    No agency in the world can guarantee a US visa — the final decision belongs to the US Embassy. However, Upnex prepares every student thoroughly for their English-language embassy interview to maximize their chances of success.
                  </p>
                </div>
                <a
                  href={telegramLink('Hello! I want to start my application with Upnex. I have finished 11th grade.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shine block w-full rounded-2xl bg-blue-600 py-4 text-center font-semibold transition hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                >
                  Start My Application →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="relative bg-slate-900/60 py-24 overflow-hidden">
        <div data-parallax="0.08" className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-blue-600/7 blur-[110px]" />
        <div data-parallax="-0.06" className="pointer-events-none absolute -left-32 top-1/3 h-[350px] w-[350px] rounded-full bg-violet-700/6 blur-[90px]" />
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p data-parallax="-0.06" className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Services</p>
            <h2 data-parallax="-0.04" className="reveal text-4xl font-bold">Everything We Handle For You</h2>
            <p className="reveal reveal-delay-1 mt-4 text-slate-400 max-w-xl mx-auto">
              From your first document to the moment you land — Upnex manages every step.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map((service, i) => (
              <a
                key={service.name}
                href={telegramLink(`Hello! I need help with: ${service.name}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`reveal-scale reveal-delay-${(i % 4) + 1} glow-card rounded-[28px] border border-white/10 bg-slate-950/70 p-6 cursor-pointer`}
              >
                <div className="mb-4 text-3xl">{service.icon}</div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{service.desc}</p>
                <p className="mt-4 text-sm text-blue-400 font-medium">Get help →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" className="relative mx-auto max-w-7xl px-6 py-24 overflow-hidden">
        <div data-parallax="0.09" className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="mb-14 text-center">
          <p data-parallax="-0.06" className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Meet The Team</p>
          <h2 data-parallax="-0.04" className="reveal text-4xl font-bold">The People Behind Upnex</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Oyatillo */}
          <div className="reveal-left overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60">
            <div data-parallax="-0.07" className="overflow-hidden">
            <img src={oyatilloImage} alt="Oyatillo" className="h-[420px] w-full object-cover object-top scale-110" />
            </div>
            <div className="p-8">
              <h3 className="text-3xl font-bold">Oyatillo</h3>
              <p className="mt-2 text-blue-400">Co-Founder • USA Representative • New York</p>
              <p className="mt-5 leading-8 text-slate-300">
                Oyatillo is Upnex's New York-based co-founder who personally handles all student documents — scholarship applications, university admissions, and visa files. Once students receive their visa, Oyatillo meets them in New York and supports them through arrival and their first days on campus.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['University Admissions', 'Scholarship Applications', 'Visa Documents', 'Student Arrival Support'].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">{tag}</span>
                ))}
              </div>
              <a
                href={telegramLink('Hello Oyatillo! I would like to get consultation about studying in the USA.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Message on Telegram
              </a>
            </div>
          </div>

          {/* Nurislom */}
          <div className="reveal-right overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60">
            <div data-parallax="-0.07" className="overflow-hidden">
            <img src={nurislomImage} alt="Nurislom" className="h-[420px] w-full object-cover object-top scale-110" />
            </div>
            <div className="p-8">
              <h3 className="text-3xl font-bold">Nurislom</h3>
              <p className="mt-2 text-blue-400">Co-Founder • Uzbekistan Director • Tashkent</p>
              <p className="mt-5 leading-8 text-slate-300">
                Nurislom is Upnex's co-founder and runs all operations from the Tashkent office. He meets every new client, signs official contracts, and manages the full Uzbekistan side — visa preparation, financial document management, embassy interview coaching, and all additional student services.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Client Contracts', 'Visa Coaching', 'Financial Docs', 'Office Management', 'Student Services'].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">{tag}</span>
                ))}
              </div>
              <a
                href={telegramLink('Hello! I would like to get consultation from the Upnex Tashkent office.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Message on Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNIVERSITIES ── */}
      <UniversitiesSection universities={universitiesData} />

      {/* ── CONTACT ── */}
      <section id="contact" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <p data-parallax="-0.06" className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Contact</p>
          <h2 data-parallax="-0.04" className="reveal text-4xl font-bold">Get In Touch</h2>
          <p className="reveal reveal-delay-1 mt-4 text-slate-400">Ready to start your journey? We're here to help.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <a
            href={TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-scale reveal-delay-1 glow-card rounded-[28px] border border-white/10 bg-white/5 p-8 text-center"
          >
            <div className="mb-4 text-5xl">✈️</div>
            <h3 className="text-xl font-semibold">Telegram</h3>
            <p className="mt-3 text-slate-400">@upnex_admin</p>
            <p className="mt-4 text-sm text-blue-400 font-medium">Message us →</p>
          </a>
          <a
            href="https://instagram.com/upnex.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-scale reveal-delay-2 glow-card rounded-[28px] border border-white/10 bg-white/5 p-8 text-center"
          >
            <div className="mb-4 text-5xl">📸</div>
            <h3 className="text-xl font-semibold">Instagram</h3>
            <p className="mt-3 text-slate-400">@upnex.uz</p>
            <p className="mt-4 text-sm text-pink-400 font-medium">Follow us →</p>
          </a>
          <a
            href={telegramLink('Hello! I would like a free consultation from Upnex.')}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-scale reveal-delay-3 glow-card btn-shine rounded-[28px] border border-blue-600/30 bg-blue-600/10 p-8 text-center"
          >
            <div className="mb-4 text-5xl">🎓</div>
            <h3 className="text-xl font-semibold">Free Consultation</h3>
            <p className="mt-3 text-slate-400">Talk to our team today</p>
            <p className="mt-4 text-sm text-blue-400 font-medium">Book now →</p>
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
        <p className="shimmer-text inline-block font-semibold">© 2025 Upnex Consulting</p>
        <p className="mt-2">New York, USA • Tashkent, Uzbekistan</p>
      </footer>
    </div>
  )
}
