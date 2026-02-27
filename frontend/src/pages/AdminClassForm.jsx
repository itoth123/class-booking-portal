import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminApi } from '../services/api'

export default function AdminClassForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    dateTime: '',
    duration: '',
    location: '',
    totalSeats: '',
  })

  useEffect(() => {
    if (isEditing) {
      loadClass()
    }
  }, [id])

  const loadClass = async () => {
    try {
      setLoading(true)
      const cls = await adminApi.getClass(id)

      // Prevent editing expired classes
      if (cls.dateTime && new Date(cls.dateTime) < new Date()) {
        navigate(`/admin/class/${id}`)
        return
      }

      setFormData({
        title: cls.title || '',
        description: cls.description || '',
        instructor: cls.instructor || '',
        dateTime: cls.dateTime ? cls.dateTime.slice(0, 16) : '',
        duration: cls.duration || '',
        location: cls.location || '',
        totalSeats: cls.totalSeats?.toString() || '',
      })
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
    setSaving(true)

    try {
      const payload = {
        ...formData,
        totalSeats: parseInt(formData.totalSeats, 10),
      }

      if (isEditing) {
        await adminApi.updateClass(id, payload)
      } else {
        await adminApi.createClass(payload)
      }
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
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
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-dark-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
          <span className="text-dark-500">|</span>
          <h1 className="text-lg font-semibold text-white">
            {isEditing ? 'Uredi tečaj' : 'Novi tečaj'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="card">
          <div className="mb-6 pb-6 border-b border-dark-100">
            <h2 className="text-xl font-bold text-dark-800">
              {isEditing ? 'Uredite podatke o tečaju' : 'Unesite podatke o novom tečaju'}
            </h2>
            <p className="text-dark-500 mt-1">Polja označena sa * su obavezna</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="label">Naziv tečaja *</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="npr. Osnove zaštite na radu"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="label">Opis</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input resize-none"
                placeholder="Kratki opis tečaja..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="instructor" className="label">Predavač</label>
                <input
                  id="instructor"
                  name="instructor"
                  type="text"
                  value={formData.instructor}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ime predavača"
                />
              </div>
              <div>
                <label htmlFor="totalSeats" className="label">Broj mjesta *</label>
                <input
                  id="totalSeats"
                  name="totalSeats"
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={handleChange}
                  className="input"
                  placeholder="20"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="dateTime" className="label">Datum i vrijeme</label>
                <input
                  id="dateTime"
                  name="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="duration" className="label">Trajanje</label>
                <input
                  id="duration"
                  name="duration"
                  type="text"
                  value={formData.duration}
                  onChange={handleChange}
                  className="input"
                  placeholder="npr. 4 sata"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="label">Lokacija</label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                className="input"
                placeholder="npr. Dvorana A, Karlovac"
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-dark-100">
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Spremanje...
                  </span>
                ) : (
                  isEditing ? 'Spremi promjene' : 'Dodaj tečaj'
                )}
              </button>
              <Link to="/admin" className="btn-secondary">
                Odustani
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
