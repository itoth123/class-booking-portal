import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminApi } from '../services/api'

const STATUS_CONFIG = {
  pending: { label: 'Na čekanju', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { label: 'Potvrđeno', bg: 'bg-green-100', text: 'text-green-700' },
  denied: { label: 'Odbijeno', bg: 'bg-red-100', text: 'text-red-700' },
}

const FEEDBACK_STATUS_CONFIG = {
  pending: { label: 'Na čekanju', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { label: 'Odobreno', bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { label: 'Odbijeno', bg: 'bg-red-100', text: 'text-red-700' },
}

function StarRating({ score, size = 'w-5 h-5' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${size} ${star <= score ? 'text-yellow-400' : 'text-dark-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function AdminClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [feedbackActionId, setFeedbackActionId] = useState(null)

  useEffect(() => {
    loadClass()
  }, [id])

  const loadClass = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getClass(id)
      setClassData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj tečaj i sve rezervacije?')) return

    try {
      setDeleting(true)
      await adminApi.deleteClass(id)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const handleStatusChange = async (bookingId, status) => {
    const msg = status === 'confirmed'
      ? 'Potvrditi ovu rezervaciju?'
      : 'Odbiti ovu rezervaciju? Mjesto će biti oslobođeno.'
    if (!confirm(msg)) return

    try {
      setActionId(bookingId)
      await adminApi.updateBookingStatus(bookingId, status)
      await loadClass()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Jeste li sigurni da želite potpuno obrisati ovu rezervaciju?')) return

    try {
      setActionId(bookingId)
      await adminApi.cancelBooking(bookingId)
      await loadClass()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleFeedbackStatusChange = async (bookingId, status) => {
    try {
      setFeedbackActionId(bookingId)
      await adminApi.updateFeedbackStatus(bookingId, status)
      await loadClass()
    } catch (err) {
      setError(err.message)
    } finally {
      setFeedbackActionId(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('hr-HR', {
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

  if (error && !classData) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="card text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/admin" className="btn-primary">Povratak</Link>
        </div>
      </div>
    )
  }

  const booked = (classData?.totalSeats || 0) - (classData?.availableSeats || 0)
  const bookings = classData?.bookings || []
  const pendingCount = bookings.filter(b => (b.status || 'pending') === 'pending').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const deniedCount = bookings.filter(b => b.status === 'denied').length
  const isExpired = classData?.dateTime && new Date(classData.dateTime) < new Date()

  const feedbackItems = classData?.feedback || []
  const feedbackTotal = feedbackItems.length
  const feedbackAverage = feedbackTotal > 0
    ? (feedbackItems.reduce((sum, fb) => sum + (fb.score || 0), 0) / feedbackTotal).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-dark-50">
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-dark-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
          <span className="text-dark-500">|</span>
          <h1 className="text-lg font-semibold text-white">Detalji tečaja</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
            {error}
          </div>
        )}

        {/* Class info */}
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-dark-100">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-lg ${isExpired ? 'bg-dark-300 shadow-dark-300/30' : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/30'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-dark-800">
                  {classData?.title}
                  {isExpired && <span className="ml-3 text-sm font-normal text-dark-400 bg-dark-200 px-3 py-1 rounded-full align-middle">Završeno</span>}
                </h2>
                {classData?.instructor && (
                  <p className="text-dark-500">Predavač: {classData.instructor}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-semibold ${classData?.availableSeats <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {classData?.availableSeats}/{classData?.totalSeats} slobodnih
                  </span>
                </div>
              </div>
            </div>
          </div>

          {classData?.description && (
            <div className="mb-4">
              <label className="label">Opis</label>
              <p className="text-dark-700">{classData.description}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-dark-50 rounded-xl p-4">
              <label className="text-dark-400 text-xs uppercase tracking-wide">Datum</label>
              <p className="text-dark-800 font-medium">{formatDate(classData?.dateTime)}</p>
            </div>
            <div className="bg-dark-50 rounded-xl p-4">
              <label className="text-dark-400 text-xs uppercase tracking-wide">Trajanje</label>
              <p className="text-dark-800 font-medium">{classData?.duration || '-'}</p>
            </div>
            <div className="bg-dark-50 rounded-xl p-4">
              <label className="text-dark-400 text-xs uppercase tracking-wide">Lokacija</label>
              <p className="text-dark-800 font-medium">{classData?.location || '-'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            {isExpired ? (
              <>
                <Link to={`/admin/class/${id}/edit`} className="btn-primary">Reaktiviraj tečaj</Link>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                  {deleting ? 'Brisanje...' : 'Obriši tečaj'}
                </button>
              </>
            ) : (
              <>
                <Link to={`/admin/class/${id}/edit`} className="btn-primary">Uredi tečaj</Link>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                  {deleting ? 'Brisanje...' : 'Obriši tečaj'}
                </button>
              </>
            )}
            <Link to="/admin" className="btn-secondary">Povratak</Link>
          </div>
        </div>

        {/* Bookings list */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h3 className="text-lg font-bold text-dark-800">
              Rezervacije ({bookings.length})
            </h3>
            {bookings.length > 0 && (
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  {pendingCount} na čekanju
                </span>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                  {confirmedCount} potvrđeno
                </span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  {deniedCount} odbijeno
                </span>
              </div>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-8 bg-dark-50 rounded-xl">
              <svg className="w-12 h-12 mx-auto text-dark-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-dark-400 text-sm">Još nema rezervacija za ovaj tečaj</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-200">
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">#</th>
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">Ime i prezime</th>
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">Email</th>
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">Telefon</th>
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">Status</th>
                    <th className="text-left py-3 px-3 text-dark-500 font-semibold">Napomena</th>
                    <th className="text-right py-3 px-3 text-dark-500 font-semibold">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => {
                    const status = booking.status || 'pending'
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
                    const isProcessing = actionId === booking.bookingId
                    return (
                      <tr key={booking.bookingId} className="border-b border-dark-100 hover:bg-dark-50 transition-colors">
                        <td className="py-3 px-3 text-dark-400">{index + 1}</td>
                        <td className="py-3 px-3 font-medium text-dark-800">
                          {booking.firstName} {booking.lastName}
                        </td>
                        <td className="py-3 px-3 text-dark-600">
                          <a href={`mailto:${booking.email}`} className="text-primary-500 hover:underline">
                            {booking.email}
                          </a>
                        </td>
                        <td className="py-3 px-3 text-dark-600">
                          {booking.phone ? (
                            <a href={`tel:${booking.phone}`} className="text-primary-500 hover:underline">
                              {booking.phone}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-dark-500 max-w-[150px] truncate">{booking.notes || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {status !== 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(booking.bookingId, 'confirmed')}
                                disabled={isProcessing}
                                className="text-green-600 hover:text-green-800 text-xs font-semibold px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                title="Potvrdi"
                              >
                                {isProcessing ? '...' : 'Potvrdi'}
                              </button>
                            )}
                            {status !== 'denied' && (
                              <button
                                onClick={() => handleStatusChange(booking.bookingId, 'denied')}
                                disabled={isProcessing}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                title="Odbij"
                              >
                                {isProcessing ? '...' : 'Odbij'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feedback panel - always visible when there are reviews or class is finished */}
        {(isExpired || feedbackTotal > 0) && (
          <div className="card mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-dark-800">
                Recenzije ({feedbackTotal})
              </h3>
              {feedbackTotal > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <StarRating score={Math.round(Number(feedbackAverage))} size="w-4 h-4" />
                    <span className="text-sm font-semibold text-dark-700">{feedbackAverage}</span>
                  </div>
                  <span className="text-sm text-dark-400">
                    ({feedbackTotal} {feedbackTotal === 1 ? 'recenzija' : feedbackTotal < 5 ? 'recenzije' : 'recenzija'})
                  </span>
                </div>
              )}
            </div>

            {feedbackItems.length === 0 ? (
              <div className="text-center py-8 bg-dark-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto text-dark-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-dark-400 text-sm">Još nema recenzija za ovaj tečaj</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackItems
                  .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
                  .map((fb) => {
                    const fbStatus = fb.status || 'pending'
                    const fbCfg = FEEDBACK_STATUS_CONFIG[fbStatus] || FEEDBACK_STATUS_CONFIG.pending
                    const isProcessing = feedbackActionId === fb.bookingId
                    return (
                      <div key={fb.bookingId} className="bg-dark-50 rounded-xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-dark-800">{fb.attendeeName || 'Nepoznato'}</span>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${fbCfg.bg} ${fbCfg.text}`}>
                              {fbCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <StarRating score={fb.score || 0} size="w-4 h-4" />
                            {fbStatus === 'pending' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleFeedbackStatusChange(fb.bookingId, 'approved')}
                                  disabled={isProcessing}
                                  className="text-green-600 hover:text-green-800 text-xs font-semibold px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                >
                                  {isProcessing ? '...' : 'Odobri'}
                                </button>
                                <button
                                  onClick={() => handleFeedbackStatusChange(fb.bookingId, 'rejected')}
                                  disabled={isProcessing}
                                  className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                  {isProcessing ? '...' : 'Odbij'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-dark-600 text-sm mb-2">{fb.comment}</p>
                        <p className="text-dark-400 text-xs">
                          {fb.submittedAt ? formatDate(fb.submittedAt) : '-'}
                        </p>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
