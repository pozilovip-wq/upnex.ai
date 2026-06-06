import { useState, useMemo, useEffect, useRef } from 'react'

const TELEGRAM = 'https://t.me/upnex_admin'
function telegramLink(msg) {
  return `${TELEGRAM}?text=${encodeURIComponent(msg)}`
}

const COUNTRIES = ['All', 'USA', 'UK', 'Canada', 'Australia']
const TAGS = ['All', 'Affordable', 'Top Ranked', 'Scholarship', 'Fast Admissions', 'Technology', 'Business', 'Health', 'Arts', 'Research']
const FLAG = { USA: '🇺🇸', UK: '🇬🇧', Canada: '🇨🇦', Australia: '🇦🇺' }

function UniCard({ u, index, expanded, onExpand }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const isOpen = expanded === u.name

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : 'translateY(24px)',
        transition: `opacity 0.45s ease ${(index % 12) * 0.06}s, transform 0.45s ease ${(index % 12) * 0.06}s`
      }}
      className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 hover:border-blue-500 transition-colors duration-300"
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

        {/* Programs (expandable) */}
        {isOpen && u.programs && (
          <div className="mb-5 rounded-2xl bg-slate-800 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Programs</p>
            <div className="flex flex-wrap gap-2">
              {u.programs.map((p) => (
                <span key={p} className="rounded-full bg-blue-900 px-3 py-1 text-xs text-blue-300">{p}</span>
              ))}
            </div>
            {u.website && (
              <a href={u.website} target="_blank" rel="noopener noreferrer"
                className="mt-3 block text-xs text-slate-400 hover:text-blue-400 transition-colors underline underline-offset-2">
                🌐 {u.website.replace('https://', '')}
              </a>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onExpand(isOpen ? null : u.name)}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-medium text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors duration-200"
          >
            {isOpen ? 'Hide' : 'Details'}
          </button>
          <a
            href={telegramLink(`Hello! I'm interested in applying to ${u.name} (${u.country}). Can you help me?`)}
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

export default function UniversitiesSection({ universities }) {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('All')
  const [tag, setTag] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [visible, setVisible] = useState(12)

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

  function reset() { setVisible(12); setExpanded(null) }

  return (
    <section id="universities" className="bg-slate-950 py-24">
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
              <UniCard key={u.name} u={u} index={i} expanded={expanded} onExpand={setExpanded} />
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
