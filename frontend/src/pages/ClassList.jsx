import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../services/api'

export default function ClassList() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const data = await publicApi.getClasses()
      setClasses(data.classes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Header */}
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-white.png" alt="SiT Logo" className="h-14" />
            <div>
              <h1 className="text-white text-xl font-bold tracking-wide">Rezervacija tečajeva</h1>
              <p className="text-dark-400 text-sm">Odaberite tečaj i rezervirajte svoje mjesto</p>
            </div>
          </div>
          <Link to="/admin/login" className="text-dark-500 hover:text-dark-300 text-xs transition-colors">
            Admin
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-dark-800 mb-2">Trenutno nema dostupnih tečajeva</h3>
            <p className="text-dark-500">Provjerite ponovo uskoro!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {classes.map((cls) => {
              const isFull = cls.availableSeats <= 0
              return (
                <div
                  key={cls.classId}
                  className={`card hover:shadow-xl transition-all duration-300 ${isFull ? 'opacity-70' : 'hover:border-primary-200'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-dark-800">{cls.title}</h3>
                      {cls.instructor && (
                        <p className="text-dark-500 text-sm mt-1 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {cls.instructor}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {isFull ? 'Popunjeno' : `${cls.availableSeats}/${cls.totalSeats} mjesta`}
                    </div>
                  </div>

                  {cls.description && (
                    <p className="text-dark-600 text-sm mb-4 line-clamp-2">{cls.description}</p>
                  )}

                  <div className="space-y-2 mb-5 text-sm text-dark-500">
                    {cls.dateTime && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(cls.dateTime)}
                      </div>
                    )}
                    {cls.duration && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {cls.duration}
                      </div>
                    )}
                    {cls.location && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {cls.location}
                      </div>
                    )}
                  </div>

                  {isFull ? (
                    <button disabled className="btn w-full bg-dark-200 text-dark-500 cursor-not-allowed">
                      Nema slobodnih mjesta
                    </button>
                  ) : (
                    <Link to={`/book/${cls.classId}`} className="btn-primary w-full text-center block">
                      Rezerviraj mjesto
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-dark-100 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-dark-400 text-sm">
          © 2025 SiT - Obrt za poslovne usluge | Trg hrvatskih branitelja 4, Karlovac | (+385) 95 523 64 60
        </div>
      </footer>
    </div>
  )
}
