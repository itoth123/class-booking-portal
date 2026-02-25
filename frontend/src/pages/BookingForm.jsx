import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { publicApi } from '../services/api'

export default function BookingForm() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [classInfo, setClassInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  })

  useEffect(() => {
    loadClass()
  }, [id])

  const loadClass = async () => {
    try {
      setLoading(true)
      const data = await publicApi.getClass(id)
      setClassInfo(data)
      if (data.availableSeats <= 0) {
        setError('Nažalost, sva mjesta su popunjena.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await publicApi.bookClass(id, formData)
      navigate('/booking-success', {
        state: {
          className: result.className || classInfo?.title,
          bookingId: result.bookingId,
          firstName: formData.firstName,
        },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('hr-HR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Header */}
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-dark-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
          <span className="text-dark-500">|</span>
          <h1 className="text-lg font-semibold text-white">Rezervacija</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Class info card */}
        {classInfo && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-dark-800 mb-2">{classInfo.title}</h2>
            {classInfo.description && (
              <p className="text-dark-600 text-sm mb-3">{classInfo.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-dark-500">
              {classInfo.instructor && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {classInfo.instructor}
                </span>
              )}
              {classInfo.dateTime && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(classInfo.dateTime)}
                </span>
              )}
              {classInfo.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {classInfo.location}
                </span>
              )}
            </div>
            <div className={`mt-4 inline-block px-3 py-1 rounded-full text-sm font-semibold ${classInfo.availableSeats <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
              {classInfo.availableSeats <= 0 ? 'Popunjeno' : `${classInfo.availableSeats}/${classInfo.totalSeats} slobodnih mjesta`}
            </div>
          </div>
        )}

        {/* Booking form */}
        <div className="card">
          <div className="mb-6 pb-6 border-b border-dark-100">
            <h2 className="text-xl font-bold text-dark-800">Vaši podaci</h2>
            <p className="text-dark-500 mt-1">Ispunite podatke za rezervaciju. Polja označena sa * su obavezna.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="firstName" className="label">Ime *</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ivan"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">Prezime *</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input"
                  placeholder="Horvat"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="ivan.horvat@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">Telefon</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+385 91 234 5678"
              />
            </div>

            <div>
              <label htmlFor="notes" className="label">Napomena</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="input resize-none"
                placeholder="Posebni zahtjevi ili napomene..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-dark-100">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || classInfo?.availableSeats <= 0}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rezervacija...
                  </span>
                ) : (
                  'Potvrdi rezervaciju'
                )}
              </button>
              <Link to="/" className="btn-secondary">
                Odustani
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
