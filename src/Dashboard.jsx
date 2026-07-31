import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

const PASSWORD = 'upnex2027'

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  handoff:     { label: '🔥 HOT',      color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
  qualified:   { label: 'Qualified',   color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
}

function scoreColor(s) {
  if (s >= 60) return '#EF4444'
  if (s >= 35) return '#F59E0B'
  if (s >= 15) return '#10B981'
  return '#6B7280'
}

function calcScore(l) {
  let s = 0
  const all = JSON.stringify(l).toLowerCase()
  if (/ielts [7-9]/.test(all)) s += 30
  else if (/ielts 6/.test(all)) s += 25
  else if (/ielts/.test(all)) s += 15
  if (/sat 1[4-9]/.test(all)) s += 30
  else if (/sat/.test(all)) s += 15
  if (/toefl/.test(all)) s += 25
  if (/c1|c2/.test(all)) s += 25
  else if (/b2/.test(all)) s += 15
  else if (/b1/.test(all)) s += 5
  if (/30000|20000|15000/.test(all)) s += 30
  else if (/10000|5000|7000/.test(all)) s += 20
  else if (/3000|2000/.test(all)) s += 10
  if (/spring 2027|bahor 2027|fall 2027|kuz 2027/.test(all)) s += 20
  if (/passport|pasport/.test(all) && /bor|ha|yes|tayyor|mavjud/.test(all)) s += 10
  if (l.status === 'handoff') s += 20
  else if (l.status === 'qualified') s += 15
  return Math.min(s, 100)
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function val(v) {
  return v && v !== 'null' && v !== 'Aniqlanmagan' ? v : null
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '40px 48px', width: 340, textAlign: 'center'
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
        <h2 style={{ color: 'var(--text)', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Upnex CRM</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px' }}>Admin Dashboard</p>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && (pw === PASSWORD ? onLogin() : setErr(true))}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
            border: `1px solid ${err ? '#EF4444' : 'var(--border)'}`,
            background: 'var(--input)', color: 'var(--text)', outline: 'none',
            boxSizing: 'border-box', marginBottom: 8
          }}
        />
        {err && <p style={{ color: '#EF4444', fontSize: 12, margin: '0 0 8px' }}>Wrong password</p>}
        <button
          onClick={() => pw === PASSWORD ? onLogin() : setErr(true)}
          style={{
            width: '100%', padding: '10px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: '#00C9A7', color: '#fff', border: 'none', cursor: 'pointer'
          }}
        >Enter Dashboard</button>
      </div>
    </div>
  )
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── LEAD CARD ────────────────────────────────────────────────────────────────
function LeadCard({ lead }) {
  const score = calcScore(lead)
  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
  const username = lead.telegram_username
  const name = val(lead.full_name) || username || lead.telegram_chat_id

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#00C9A7'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.3 }}>{name}</div>
          {username && (
            <a
              href={`https://t.me/${username}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#00C9A7', fontSize: 12, textDecoration: 'none' }}
            >@{username}</a>
          )}
          {!username && (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>ID: {lead.telegram_chat_id}</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            color: st.color, background: st.bg, whiteSpace: 'nowrap'
          }}>{st.label}</span>
          <span style={{ fontSize: 11, color: scoreColor(score), fontWeight: 700 }}>Score {score}/100</span>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
        {[
          ['🌍', val(lead.country)],
          ['🎓', val(lead.program)],
          ['📅', val(lead.semester)],
          ['🗣', val(lead.english_level)],
          ['💰', val(lead.budget)],
          ['📄', val(lead.passport)],
        ].map(([icon, v]) => v ? (
          <div key={icon} style={{ color: 'var(--muted)', display: 'flex', gap: 4 }}>
            <span>{icon}</span>
            <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ) : null)}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>🕒 {timeAgo(lead.last_message_at)}</span>
        <a
          href={`tg://user?id=${lead.telegram_chat_id}`}
          style={{
            fontSize: 12, fontWeight: 600, color: '#fff', background: '#00C9A7',
            padding: '4px 12px', borderRadius: 6, textDecoration: 'none'
          }}
        >Open Chat →</a>
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('upnex_crm') === '1')
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('last_message_at', { ascending: false })
    if (!error && data) {
      setLeads(data)
      setLastSync(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchLeads()

    // Realtime subscription
    const channel = supabase
      .channel('leads-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [authed, fetchLeads])

  if (!authed) {
    return <Login onLogin={() => { sessionStorage.setItem('upnex_crm', '1'); setAuthed(true) }} />
  }

  const filtered = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.full_name?.toLowerCase().includes(q) ||
        l.telegram_username?.toLowerCase().includes(q) ||
        l.country?.toLowerCase().includes(q) ||
        l.telegram_chat_id?.includes(q)
      )
    }
    return true
  }).sort((a, b) => calcScore(b) - calcScore(a))

  const counts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    in_progress: leads.filter(l => l.status === 'in_progress').length,
    handoff: leads.filter(l => l.status === 'handoff').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
  }

  const FILTERS = [
    { key: 'all',         label: 'All Leads',    count: counts.all },
    { key: 'handoff',     label: '🔥 HOT',        count: counts.handoff },
    { key: 'qualified',   label: '✅ Qualified',  count: counts.qualified },
    { key: 'in_progress', label: '💬 In Progress',count: counts.in_progress },
    { key: 'new',         label: '🆕 New',        count: counts.new },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif', color: 'var(--text)' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎓</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Upnex CRM</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.15)',
            padding: '2px 8px', borderRadius: 20
          }}>● LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {lastSync && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Updated {lastSync.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => { sessionStorage.removeItem('upnex_crm'); setAuthed(false) }}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer'
            }}
          >Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Stat label="Total Leads" value={counts.all} />
          <Stat label="🔥 HOT" value={counts.handoff} color="#EF4444" />
          <Stat label="✅ Qualified" value={counts.qualified} color="#10B981" />
          <Stat label="💬 In Progress" value={counts.in_progress} color="#F59E0B" />
          <Stat label="🆕 New" value={counts.new} color="#6B7280" />
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search by name, username, country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--text)', outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${filter === f.key ? '#00C9A7' : 'var(--border)'}`,
                  background: filter === f.key ? 'rgba(0,201,167,0.15)' : 'var(--card)',
                  color: filter === f.key ? '#00C9A7' : 'var(--muted)'
                }}
              >{f.label} ({f.count})</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 14 }}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 14 }}>No leads found</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              Showing {filtered.length} lead{filtered.length !== 1 ? 's' : ''} — sorted by score
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12
            }}>
              {filtered.map(lead => <LeadCard key={lead.id} lead={lead} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
