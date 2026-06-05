import { useState } from 'react'
import logo from './IMG_4167.JPG'
import oyatilloImage from './IMG_4405.jpeg'
import nurislomImage from './IMG_5404.JPG'

const WHATSAPP_NUMBER = '998990552772'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

function whatsappLink(message) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}

export default function App() {
  const [expandedUniversity, setExpandedUniversity] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const countries = [
    { name: 'USA', flag: '🇺🇸', description: 'Top universities, strong scholarships, and career opportunities.' },
    { name: 'UK', flag: '🇬🇧', description: 'Prestigious universities and shorter degree programs.' },
    { name: 'Canada', flag: '🇨🇦', description: 'Affordable tuition, safe cities, and work opportunities.' },
    { name: 'Australia', flag: '🇦🇺', description: 'Modern education system and high quality of life.' }
  ]

  const services = [
    { name: 'University Admissions', desc: 'We help you find and apply to the right university based on your goals and budget.' },
    { name: 'Scholarship Assistance', desc: 'Get guidance on scholarships covering up to 80–100% of your tuition fees.' },
    { name: 'Visa Preparation', desc: 'Step-by-step support for preparing your student visa application documents.' },
    { name: 'DS-160 Help', desc: 'Accurate and complete DS-160 form filling for US visa applicants.' },
    { name: 'Embassy Interview Practice', desc: 'Mock interviews and coaching to help you confidently face embassy interviews.' },
    { name: 'Accommodation Support', desc: 'Assistance finding safe and affordable housing near your university.' },
    { name: 'English Courses', desc: 'Improve your English to meet university and visa language requirements.' },
    { name: 'Post-Arrival Support', desc: 'We stay with you after arrival — orientation, local tips, and ongoing help.' }
  ]

  const universities = [
    {
      name: 'Hartwick College',
      location: 'Oneonta, New York',
      tuition: '$25,000–$35,000 / year',
      scholarship: 'Up to $32,000',
      tag: 'Affordable',
      details: 'Hartwick College is a small liberal arts college in upstate New York. It offers generous merit scholarships to international students, no SAT required, and has a welcoming campus community. Programs available in business, science, arts, and more.',
      website: 'https://www.hartwick.edu'
    },
    {
      name: 'Pace University',
      location: 'New York City, New York',
      tuition: '$48,000–$55,000 / year',
      scholarship: 'Up to $30,000',
      tag: 'NYC',
      details: 'Pace University is located in the heart of New York City with campuses in Manhattan and Westchester. Strong programs in business, law, nursing, and technology. Excellent internship and career opportunities in NYC.',
      website: 'https://www.pace.edu'
    },
    {
      name: 'Monroe University',
      location: 'Bronx, New York',
      tuition: '$15,000–$25,000 / year',
      scholarship: 'Up to $3,500 / semester',
      tag: 'Fast Admissions',
      details: 'Monroe University offers fast admissions decisions and affordable tuition in the Bronx, New York. Focus on business, criminal justice, and computer science. Many students receive admission within days of applying.',
      website: 'https://www.monroecollege.edu'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
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
            <a href="#home" className="transition hover:text-white">Home</a>
            <a href="#about" className="transition hover:text-white">About</a>
            <a href="#services" className="transition hover:text-white">Services</a>
            <a href="#universities" className="transition hover:text-white">Universities</a>
            <a href="#team" className="transition hover:text-white">Team</a>
            <a href="#contact" className="transition hover:text-white">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              WhatsApp
            </a>
            <a
              href={whatsappLink('Hello! I would like a free consultation from Upnex.')}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold transition hover:bg-blue-500"
            >
              Free Consultation
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/30 via-slate-950 to-slate-950" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
              Trusted By Students In USA, UK, Canada & Australia
            </div>

            <h2 className="mb-6 text-5xl font-bold leading-tight lg:text-7xl">
              We Are Upnex. <br />
              <span className="text-blue-400">You Are Going To Be Next.</span>
            </h2>

            <p className="mb-8 max-w-2xl text-lg leading-8 text-slate-300">
              Upnex helps students receive high scholarships in the USA, UK, Canada, and Australia. Many students can apply without IELTS or SAT and begin their study abroad journey faster.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href={whatsappLink('Hello! I would like to book a free consultation with Upnex.')}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-blue-600 px-7 py-4 text-sm font-semibold transition hover:bg-blue-500"
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

            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h3 className="text-2xl font-bold">500+</h3>
                <p className="mt-2 text-sm text-slate-400">Students Guided</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h3 className="text-2xl font-bold">80-100%</h3>
                <p className="mt-2 text-sm text-slate-400">Scholarship Opportunities</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h3 className="text-2xl font-bold">4</h3>
                <p className="mt-2 text-sm text-slate-400">Countries Covered</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h3 className="text-2xl font-bold">NY + UZ</h3>
                <p className="mt-2 text-sm text-slate-400">International Team</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <img src={oyatilloImage} alt="Oyatillo" className="h-[650px] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* COUNTRIES */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Countries</p>
          <h2 className="text-4xl font-bold">Study In Top Countries</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {countries.map((country) => (
            <a
              key={country.name}
              href={whatsappLink(`Hello! I'm interested in studying in ${country.name}. Can you help me?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[28px] border border-white/10 bg-white/5 p-8 transition hover:-translate-y-2 hover:border-blue-500/40 hover:bg-white/10 cursor-pointer"
            >
              <div className="mb-5 text-5xl">{country.flag}</div>
              <h3 className="text-2xl font-semibold">{country.name}</h3>
              <p className="mt-4 leading-7 text-slate-400">{country.description}</p>
              <p className="mt-4 text-sm text-blue-400 font-medium">Ask about {country.name} →</p>
            </a>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-slate-900/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Services</p>
            <h2 className="text-4xl font-bold">Everything Students Need</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <a
                key={service.name}
                href={whatsappLink(`Hello! I need help with: ${service.name}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 transition hover:border-blue-500/40 hover:bg-slate-900 cursor-pointer"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-xl text-blue-300">
                  ✦
                </div>
                <h3 className="text-xl font-semibold">{service.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{service.desc}</p>
                <p className="mt-4 text-sm text-blue-400 font-medium">Get help →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Meet The Team</p>
          <h2 className="text-4xl font-bold">The People Behind Upnex</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60">
            <img src={oyatilloImage} alt="Oyatillo" className="h-[420px] w-full object-cover object-top" />
            <div className="p-8">
              <h3 className="text-3xl font-bold">Oyatillo</h3>
              <p className="mt-2 text-blue-400">USA-Based Consultant • New York</p>
              <p className="mt-5 leading-8 text-slate-300">
                Oyatillo is based in New York and helps students with university selection, scholarship planning, and full support for studying in the USA.
              </p>
              <a
                href={whatsappLink('Hello Oyatillo! I would like to get consultation about studying in the USA.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Message Oyatillo
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60">
            <img src={nurislomImage} alt="Nurislom" className="h-[420px] w-full object-cover object-top" />
            <div className="p-8">
              <h3 className="text-3xl font-bold">Nurislom</h3>
              <p className="mt-2 text-blue-400">Uzbekistan-Based Consultant • Tashkent</p>
              <p className="mt-5 leading-8 text-slate-300">
                Nurislom runs the Upnex office in Uzbekistan and guides students through the entire application process from document preparation to visa support.
              </p>
              <a
                href={whatsappLink('Hello! I would like to get consultation from the Upnex team.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Message Nurislom
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERSITIES */}
      <section id="universities" className="bg-slate-900/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Universities</p>
            <h2 className="text-4xl font-bold">Popular University Options</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {universities.map((university) => (
              <div key={university.name} className="rounded-[30px] border border-white/10 bg-slate-950/70 p-7 transition hover:-translate-y-2 hover:border-blue-500/40">
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-medium text-blue-300">
                  {university.tag}
                </span>

                <h3 className="mt-6 text-2xl font-bold">{university.name}</h3>
                <p className="mt-2 text-slate-400">{university.location}</p>

                <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tuition</span>
                    <span>{university.tuition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scholarship</span>
                    <span>{university.scholarship}</span>
                  </div>
                </div>

                {expandedUniversity === university.name && (
                  <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm leading-7 text-slate-300">
                    {university.details}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setExpandedUniversity(expandedUniversity === university.name ? null : university.name)}
                    className="flex-1 rounded-2xl border border-white/20 py-3 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-400"
                  >
                    {expandedUniversity === university.name ? 'Hide Details' : 'View Details'}
                  </button>
                  <a
                    href={whatsappLink(`Hello! I'm interested in applying to ${university.name}. Can you help me?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-2xl bg-blue-600 py-3 text-center text-sm font-semibold transition hover:bg-blue-500"
                  >
                    Apply Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Contact</p>
          <h2 className="text-4xl font-bold">Get In Touch</h2>
          <p className="mt-4 text-slate-400">Ready to start your journey? We're here to help.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center transition hover:-translate-y-2 hover:border-green-500/40 hover:bg-white/10"
          >
            <div className="mb-4 text-5xl">💬</div>
            <h3 className="text-xl font-semibold">WhatsApp</h3>
            <p className="mt-3 text-slate-400">+998 99 055 2772</p>
            <p className="mt-4 text-sm text-green-400 font-medium">Chat now →</p>
          </a>

          <a
            href="https://instagram.com/upnex.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center transition hover:-translate-y-2 hover:border-pink-500/40 hover:bg-white/10"
          >
            <div className="mb-4 text-5xl">📸</div>
            <h3 className="text-xl font-semibold">Instagram</h3>
            <p className="mt-3 text-slate-400">@upnex.uz</p>
            <p className="mt-4 text-sm text-pink-400 font-medium">Follow us →</p>
          </a>

          <a
            href={whatsappLink('Hello! I would like a free consultation from Upnex.')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[28px] border border-white/10 bg-blue-600/20 p-8 text-center transition hover:-translate-y-2 hover:border-blue-500/60 hover:bg-blue-600/30"
          >
            <div className="mb-4 text-5xl">🎓</div>
            <h3 className="text-xl font-semibold">Free Consultation</h3>
            <p className="mt-3 text-slate-400">Talk to our team today</p>
            <p className="mt-4 text-sm text-blue-400 font-medium">Book now →</p>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
        <p>© 2025 Upnex Consulting. All rights reserved.</p>
        <p className="mt-2">New York, USA • Tashkent, Uzbekistan</p>
      </footer>
    </div>
  )
}
