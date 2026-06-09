import { useState, useMemo, useEffect, useRef } from 'react'

const TELEGRAM = 'https://t.me/upnex_admin'
function telegramLink(msg) {
  return `${TELEGRAM}?text=${encodeURIComponent(msg)}`
}

const COUNTRIES = ['All', 'USA', 'UK', 'Canada', 'Australia']
const TAGS = ['All', 'Affordable', 'Top Ranked', 'Scholarship', 'Fast Admissions', 'Technology', 'Business', 'Health', 'Arts', 'Research']
const FLAG = { USA: '🇺🇸', UK: '🇬🇧', Canada: '🇨🇦', Australia: '🇦🇺' }

const COUNTRY_FACTS = {
  USA: { visa: 'F-1 Student Visa', currency: 'USD', language: 'English', workRight: '20 hrs/week on campus + OPT after graduation' },
  UK: { visa: 'Student Visa (Tier 4)', currency: 'GBP', language: 'English', workRight: '20 hrs/week during studies' },
  Canada: { visa: 'Study Permit', currency: 'CAD', language: 'English / French', workRight: '20 hrs/week + 3-year PGWP after graduation' },
  Australia: { visa: 'Student Visa (Subclass 500)', currency: 'AUD', language: 'English', workRight: '48 hrs/fortnight during studies' },
}

/* ─── UNIVERSITY DETAIL MODAL ─── */
function UniModal({ u, onClose }) {
  const facts = COUNTRY_FACTS[u.country] || {}

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const description = u.details ||
    `${u.name} is a well-regarded institution in ${u.location} offering quality education to international students. ` +
    `The university provides strong academic programs, modern facilities, and dedicated support services for students from Central Asia and beyond. ` +
    `With generous scholarship opportunities and multiple intake dates, it is an excellent choice for Uzbek students seeking a world-class education.`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl border-b border-slate-800 bg-slate-900 p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{FLAG[u.country]}</span>
              <span className="rounded-full bg-blue-900 border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-300">{u.tag}</span>
            </div>
            <h2 className="text-xl font-bold text-white leading-snug mt-2">{u.name}</h2>
            <p className="text-sm text-slate-400 mt-1">📍 {u.location}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* About */}
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 mb-2">About</p>
            <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
          </div>

          {/* Key Stats */}
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 mb-3">Key Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Tuition / Year</p>
                <p className="text-sm font-semibold text-white">{u.tuition}</p>
              </div>
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Scholarship</p>
                <p className="text-sm font-semibold text-green-400">{u.scholarship}</p>
              </div>
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">English Requirement</p>
                <p className="text-sm font-semibold text-white">{u.ielts}</p>
              </div>
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Intakes</p>
                <p className="text-sm font-semibold text-white">{u.intakes}</p>
              </div>
            </div>
          </div>

          {/* Programs */}
          {u.programs && u.programs.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-400 mb-3">Available Programs</p>
              <div className="flex flex-wrap gap-2">
                {u.programs.map((p) => (
                  <span key={p} className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Country Info */}
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 mb-3">Studying in {u.country}</p>
            <div className="rounded-2xl bg-slate-800 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Visa Type</span>
                <span className="text-white font-medium">{facts.visa}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Currency</span>
                <span className="text-white font-medium">{facts.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Work Rights</span>
                <span className="text-white font-medium text-right max-w-[60%]">{facts.workRight}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            {u.website && (
              <a
                href={u.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3.5 text-center text-sm font-semibold text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                🌐 Official Website
              </a>
            )}
            <a
              href={telegramLink(`Salom! ${u.name} universiteti (${u.country}) haqida batafsil ma'lumot olmoqchiman. Yordam bera olasizmi?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-center text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              📩 Apply with Upnex
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── UNIVERSITY CARD ─── */
function UniCard({ u, index, onOpenModal }) {
  const stagger = (index % 12) * 0.055

  return (
    <div
      style={{
        animation: `cardSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${stagger}s both`
      }}
      className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 hover:border-blue-500 transition-colors duration-300 cursor-pointer"
      onClick={() => onOpenModal(u)}
    >
      <div className="flex flex-col flex-1 p-6">

        {/* Top row */}
        <div className="flex items-center justify-between mb-5">
          <span className="rounded-full bg-blue-900 border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-300">
            {u.tag}
          </span>
          <span className="text-2xl">{FLAG[u.country]}</span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-bold text-white leading-snug mb-1">{u.name}</h3>
        <p className="text-sm text-slate-500 mb-5">📍 {u.location}</p>

        {/* Info rows */}
        <div className="space-y-3 border-t border-slate-800 pt-4 mb-5">
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs text-slate-500 shrink-0">Tuition</span>
            <span className="text-xs text-white text-right">{u.tuition}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs text-slate-500 shrink-0">Scholarship</span>
            <span className="text-xs text-green-400 text-right font-medium">{u.scholarship}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs text-slate-500 shrink-0">English</span>
            <span className="text-xs text-white text-right">{u.ielts}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs text-slate-500 shrink-0">Intakes</span>
            <span className="text-xs text-white text-right">{u.intakes}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Buttons */}
        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenModal(u)}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-medium text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors duration-200"
          >
            Full Info
          </button>
          <a
            href={telegramLink(`Salom! ${u.name} (${u.country}) universitetiga ariza topshirmoqchiman. Yordam bera olasizmi?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-2xl bg-blue-600 py-3 text-center text-sm font-medium text-white hover:bg-blue-500 transition-colors duration-200"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN SECTION ─── */
export default function UniversitiesSection({ universities }) {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('All')
  const [tag, setTag] = useState('All')
  const [visible, setVisible] = useState(12)
  const [modalUni, setModalUni] = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return universities.filter((u) => {
      const matchSearch = !q ||
        u.name.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        (u.programs || []).some((p) => p.toLowerCase().includes(q))
      return matchSearch &&
        (country === 'All' || u.country === country) &&
        (tag === 'All' || u.tag === tag)
    })
  }, [universities, search, country, tag])

  const shown = filtered.slice(0, visible)

  function reset() { setVisible(12) }

  return (
    <section id="universities" className="bg-slate-950 py-24">
      {modalUni && <UniModal u={modalUni} onClose={() => setModalUni(null)} />}

      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm uppercase tracking-widest text-blue-400">Universities</p>
          <h2 className="text-4xl font-bold text-white lg:text-5xl">Find Your University</h2>
          <p className="mt-4 text-slate-400">
            Browse {universities.length}+ universities across 4 countries.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search by university, city, or program..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset() }}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 pl-14 pr-5 text-white placeholder-slate-600 outline-none focus:border-blue-500 transition-colors duration-200"
          />
        </div>

        {/* Country tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCountry(c); reset() }}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                country === c
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {c !== 'All' ? FLAG[c] + ' ' : ''}{c}
            </button>
          ))}
        </div>

        {/* Tag tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => { setTag(t); reset() }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200 ${
                tag === t
                  ? 'bg-slate-600 border-slate-500 text-white'
                  : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="mb-6 text-sm text-slate-600">
          Showing <span className="text-white font-medium">{Math.min(visible, filtered.length)}</span> of{' '}
          <span className="text-white font-medium">{filtered.length}</span> universities
          {country !== 'All' && <span className="text-blue-400"> · {country}</span>}
          {tag !== 'All' && <span className="text-blue-400"> · {tag}</span>}
          {search && <span className="text-blue-400"> · "{search}"</span>}
        </p>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-5xl mb-4">🎓</p>
            <p className="text-xl font-semibold text-white">No results found</p>
            <p className="mt-2 text-slate-500">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((u, i) => (
              <UniCard key={u.name} u={u} index={i} onOpenModal={setModalUni} />
            ))}
          </div>
        )}

        {/* Load more */}
        {visible < filtered.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisible((v) => v + 12)}
              className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 px-8 py-3.5 text-sm font-semibold text-slate-300 hover:border-blue-500 hover:text-white transition-colors duration-200"
            >
              Load More
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs text-white">
                +{filtered.length - visible}
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
