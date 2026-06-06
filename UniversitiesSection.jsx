import { useState, useMemo, useEffect, useRef } from 'react'

const TELEGRAM = 'https://t.me/upnex_admin'
function telegramLink(message) {
  return `${TELEGRAM}?text=${encodeURIComponent(message)}`
}

const COUNTRIES = ['All', 'USA', 'UK', 'Canada', 'Australia']
const TAGS = ['All', 'Affordable', 'Top Ranked', 'Scholarship', 'Fast Admissions', 'Technology', 'Business', 'Health', 'Arts', 'Research']
const countryFlag = { USA: '🇺🇸', UK: '🇬🇧', Canada: '🇨🇦', Australia: '🇦🇺' }
const tagColors = {
  'Affordable':      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Top Ranked':      'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Scholarship':     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Fast Admissions': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Technology':      'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'Business':        'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Health':          'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'Arts':            'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Research':        'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  'NYC':             'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

function useInView(ref) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return inView
}

function UniCard({ university, index, expanded, onExpand }) {
  const ref = useRef(null)
  const inView = useInView(ref)
  const isExpanded = expanded === university.name
  const tagClass = tagColors[university.tag] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.5s ease ${index * 0.07}s, transform 0.5s ease ${index * 0.07}s`,
      }}
      className="group relative flex flex-col rounded-[24px] border border-white/8 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden"
    >
      {/* Hover glow border */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.4)' }} />

      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex flex-col flex-1 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${tagClass}`}>
            {university.tag}
          </span>
          <span className="text-2xl">{countryFlag[university.country]}</span>
        </div>

        {/* Name & location */}
        <h3 className="text-lg font-bold leading-snug text-white group-hover:text-blue-200 transition-colors duration-300">
          {university.name}
        </h3>
        <p className="mt-1 text-sm text-slate-500 flex items-center gap-1">
          <span>📍</span> {university.location}
        </p>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/4 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Tuition</p>
            <p className="text-xs font-semibold text-white leading-tight">{university.tuition}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/8 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-500/70 mb-1">Scholarship</p>
            <p className="text-xs font-semibold text-emerald-400 leading-tight">{university.scholarship}</p>
          </div>
          <div className="rounded-xl bg-white/4 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">English</p>
            <p className="text-xs font-semibold text-white leading-tight">{university.ielts}</p>
          </div>
          <div className="rounded-xl bg-white/4 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Intakes</p>
            <p className="text-xs font-semibold text-white leading-tight">{university.intakes}</p>
          </div>
        </div>

        {/* Expanded programs */}
        <div style={{
          maxHeight: isExpanded ? '300px' : '0',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s ease, opacity 0.3s ease',
        }}>
          {university.programs && (
            <div className="mt-4 rounded-xl bg-white/4 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Popular Programs</p>
              <div className="flex flex-wrap gap-2">
                {university.programs.map((p) => (
                  <span key={p} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-300">
                    {p}
                  </span>
                ))}
              </div>
              {university.website && (
                <a href={university.website} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors">
                  🌐 <span className="underline underline-offset-2">{university.website.replace('https://', '')}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Buttons */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onExpand(isExpanded ? null : university.name)}
            className="flex-1 rounded-xl border border-white/10 bg-white/4 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-blue-500/40 hover:bg-blue-500/8 hover:text-blue-300"
          >
            {isExpanded ? 'Hide' : 'Details'}
          </button>
          <a
            href={telegramLink(`Hello! I'm interested in applying to ${university.name} in ${university.country}. Can you help me?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
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
  const [visibleCount, setVisibleCount] = useState(12)

  const filtered = useMemo(() => {
    return universities.filter((u) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        u.name.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        (u.programs || []).some((p) => p.toLowerCase().includes(q))
      const matchCountry = country === 'All' || u.country === country
      const matchTag = tag === 'All' || u.tag === tag
      return matchSearch && matchCountry && matchTag
    })
  }, [universities, search, country, tag])

  const visible = filtered.slice(0, visibleCount)

  function handleFilter(type, value) {
    if (type === 'country') setCountry(value)
    if (type === 'tag') setTag(value)
    setVisibleCount(12)
    setExpanded(null)
  }

  return (
    <section id="universities" className="py-24" style={{ background: 'linear-gradient(to bottom, #0a0f1e, #020617)' }}>
      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Universities</p>
          <h2 className="text-4xl font-bold lg:text-5xl">Find Your University</h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            Browse {universities.length}+ universities across 4 countries. Search by name, city, or program.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 relative group">
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
            style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.1)' }} />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search by university, city, or program..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(12) }}
            className="w-full rounded-2xl border border-white/8 bg-slate-900/80 py-4 pl-14 pr-6 text-white placeholder-slate-600 outline-none transition-all duration-300 focus:bg-slate-900 backdrop-blur-xl"
          />
        </div>

        {/* Country filters */}
        <div className="mb-3 flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => handleFilter('country', c)}
              style={{ transition: 'all 0.2s ease' }}
              className={`rounded-full px-4 py-2 text-sm font-medium border ${
                country === c
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'border-white/10 bg-white/4 text-slate-400 hover:border-blue-500/40 hover:text-white hover:bg-white/8'
              }`}
            >
              {c !== 'All' ? countryFlag[c] + ' ' : ''}{c}
            </button>
          ))}
        </div>

        {/* Tag filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => handleFilter('tag', t)}
              style={{ transition: 'all 0.2s ease' }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                tag === t
                  ? 'bg-slate-600 border-slate-500 text-white'
                  : 'border-white/8 bg-white/4 text-slate-500 hover:border-white/20 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="mb-6 text-sm text-slate-600">
          Showing <span className="text-slate-300 font-medium">{Math.min(visibleCount, filtered.length)}</span> of{' '}
          <span className="text-slate-300 font-medium">{filtered.length}</span> universities
          {search && <span> for "<span className="text-blue-400">{search}</span>"</span>}
          {country !== 'All' && <span> in <span className="text-blue-400">{country}</span></span>}
        </p>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-6xl mb-5">🎓</p>
            <p className="text-2xl font-semibold text-white">No universities found</p>
            <p className="mt-3 text-slate-500">Try a different search term or filter</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((uni, i) => (
              <UniCard
                key={uni.name}
                university={uni}
                index={i}
                expanded={expanded}
                onExpand={setExpanded}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {visibleCount < filtered.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((v) => v + 12)}
              className="group relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/4 px-8 py-3.5 text-sm font-semibold text-slate-300 transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/8 hover:text-white hover:shadow-lg hover:shadow-blue-500/10"
            >
              <span>Load More Universities</span>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">
                {filtered.length - visibleCount} remaining
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
