import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../services/api'

export default function AdminDashboard() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [tab, setTab] = useState('active')

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getClasses()
      setClasses(data.classes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj tečaj i sve njegove rezervacije?')) return

    try {
      setDeleteId(id)
      await adminApi.deleteClass(id)
      setClasses(classes.filter(c => c.classId !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalSeats = classes.reduce((sum, c) => sum + (c.totalSeats || 0), 0)
  const availableSeats = classes.reduce((sum, c) => sum + (c.availableSeats || 0), 0)
  const takenSeats = totalSeats - availableSeats

  const now = new Date()
  const activeClasses = classes.filter(c => !c.dateTime || new Date(c.dateTime) >= now)
  const expiredClasses = classes.filter(c => c.dateTime && new Date(c.dateTime) < now)
  const displayedClasses = tab === 'active' ? activeClasses : expiredClasses

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Header */}
      <header className="bg-dark-900 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-white.png" alt="SiT Logo" className="h-14" />
            <span className="text-primary-500 text-sm font-semibold uppercase tracking-wider">Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-dark-300 text-sm hidden sm:block">{user?.email}</span>
            <Link to="/" className="text-dark-400 hover:text-white text-sm transition-colors">
              Javni prikaz
            </Link>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Odjava
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-800">{classes.length}</div>
              <div className="text-dark-500 text-sm">Ukupno tečajeva</div>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-800">{takenSeats}</div>
              <div className="text-dark-500 text-sm">Zauzeto mjesta</div>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-800">{availableSeats}</div>
              <div className="text-dark-500 text-sm">Slobodnih mjesta</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-dark-800">Tečajevi</h2>
            <Link to="/admin/class/new" className="btn-primary">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj tečaj
              </span>
            </Link>
          </div>
          <div className="flex gap-1 border-b border-dark-100">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'active' ? 'border-primary-500 text-primary-600' : 'border-transparent text-dark-400 hover:text-dark-600'}`}
            >
              Aktivni ({activeClasses.length})
            </button>
            <button
              onClick={() => setTab('expired')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'expired' ? 'border-primary-500 text-primary-600' : 'border-transparent text-dark-400 hover:text-dark-600'}`}
            >
              Završeni ({expiredClasses.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Zatvori</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-dark-800 mb-2">Nema tečajeva</h3>
            <p className="text-dark-500 mb-6">Započnite dodavanjem prvog tečaja</p>
            <Link to="/admin/class/new" className="btn-primary">Dodaj prvi tečaj</Link>
          </div>
        ) : displayedClasses.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-dark-400">{tab === 'active' ? 'Nema aktivnih tečajeva' : 'Nema završenih tečajeva'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedClasses.map((cls) => {
              const isFull = cls.availableSeats <= 0
              const isExpired = cls.dateTime && new Date(cls.dateTime) < now
              return (
                <div
                  key={cls.classId}
                  className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 cursor-pointer group ${isExpired ? 'opacity-60 bg-dark-50' : 'hover:shadow-xl hover:border-primary-200'}`}
                  onClick={() => navigate(`/admin/class/${cls.classId}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg group-hover:scale-110 transition-transform ${isExpired ? 'bg-dark-300 shadow-dark-300/30' : isFull ? 'bg-dark-300 shadow-dark-300/30' : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/30'}`}>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`font-semibold transition-colors ${isExpired ? 'text-dark-400' : 'text-dark-800 group-hover:text-primary-600'}`}>
                        {cls.title}
                        {isExpired && <span className="ml-2 text-xs font-normal text-dark-400 bg-dark-200 px-2 py-0.5 rounded-full">Završeno</span>}
                      </h3>
                      <p className="text-dark-500 text-sm">
                        {cls.dateTime ? formatDate(cls.dateTime) : 'Datum nije postavljen'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-sm font-medium ${isExpired ? 'text-dark-400' : isFull ? 'text-red-500' : 'text-green-600'}`}>
                          {cls.availableSeats}/{cls.totalSeats} slobodnih
                        </span>
                        {cls.instructor && (
                          <span className="text-dark-400 text-sm">• {cls.instructor}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isExpired && (
                    <div className="flex gap-2 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/admin/class/${cls.classId}/edit`}
                        className="btn-secondary text-sm py-2"
                      >
                        Uredi
                      </Link>
                      <button
                        onClick={() => handleDelete(cls.classId)}
                        disabled={deleteId === cls.classId}
                        className="btn-danger text-sm py-2"
                      >
                        {deleteId === cls.classId ? 'Brisanje...' : 'Obriši'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-dark-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-dark-400 text-sm">
          © 2025 SiT - Obrt za poslovne usluge | Trg hrvatskih branitelja 4, Karlovac | (+385) 95 523 64 60
        </div>
      </footer>
    </div>
  )
}
