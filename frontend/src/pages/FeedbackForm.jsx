import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '../services/api'

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={`text-3xl transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          aria-label={`${star} ${star === 1 ? 'zvjezdica' : 'zvjezdica'}`}
        >
          <span className={
            (hovered || value) >= star
              ? 'text-yellow-400'
              : 'text-dark-300'
          }>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

export default function FeedbackForm() {
  const { token } = useParams()

  const [state, setState] = useState('loading') // loading | error | already_submitted | form | success
  const [classInfo, setClassInfo] = useState(null)
  const [previousFeedback, setPreviousFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    loadFeedbackInfo()
  }, [token])

  const loadFeedbackInfo = async () => {
    try {
      setState('loading')
      const data = await publicApi.getFeedbackInfo(token)
      setClassInfo({ title: data.classTitle, date: data.classDate })

      if (data.alreadySubmitted) {
        setPreviousFeedback({ score: data.score, comment: data.comment })
        setState('already_submitted')
      } else {
        setState('form')
      }
    } catch {
      setState('error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (score === 0) {
      setSubmitError('Molimo odaberite ocjenu.')
      return
    }
    if (!comment.trim()) {
      setSubmitError('Molimo unesite komentar.')
      return
    }

    setSubmitting(true)
    try {
      await publicApi.submitFeedback(token, { score, comment: comment.trim() })
      setState('success')
    } catch (err) {
      setSubmitError(err.message || 'Došlo je do greške. Pokušajte ponovo.')
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

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Invalid token error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-dark-50">
        <header className="bg-dark-900 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
            <span className="text-dark-500">|</span>
            <h1 className="text-lg font-semibold text-white">Recenzija</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="card text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-dark-800 mb-2">Ova poveznica nije valjana</h2>
            <p className="text-dark-500">Poveznica za recenziju nije ispravna ili je istekla.</p>
          </div>
        </main>
      </div>
    )
  }

  // Already submitted state
  if (state === 'already_submitted') {
    return (
      <div className="min-h-screen bg-dark-50">
        <header className="bg-dark-900 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
            <span className="text-dark-500">|</span>
            <h1 className="text-lg font-semibold text-white">Recenzija</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-12">
          {classInfo && (
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-dark-800 mb-1">{classInfo.title}</h2>
              <p className="text-dark-500 text-sm">{formatDate(classInfo.date)}</p>
            </div>
          )}
          <div className="card text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-dark-800 mb-4">Već ste ostavili recenziju</h2>
            {previousFeedback && (
              <div className="max-w-md mx-auto text-left">
                <div className="mb-3">
                  <p className="text-dark-500 text-sm mb-1">Vaša ocjena:</p>
                  <StarRating value={previousFeedback.score} readOnly />
                </div>
                <div>
                  <p className="text-dark-500 text-sm mb-1">Vaš komentar:</p>
                  <p className="text-dark-700 bg-dark-50 rounded-xl p-4">{previousFeedback.comment}</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-dark-50">
        <header className="bg-dark-900 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
            <span className="text-dark-500">|</span>
            <h1 className="text-lg font-semibold text-white">Recenzija</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="card text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-dark-800 mb-2">Hvala na Vašoj recenziji!</h2>
            <p className="text-dark-500">Vaša recenzija je zaprimljena i bit će pregledana.</p>
          </div>
        </main>
      </div>
    )
  }

  // Form state (default)
  return (
    <div className="min-h-screen bg-dark-50">
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
          <span className="text-dark-500">|</span>
          <h1 className="text-lg font-semibold text-white">Recenzija</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {classInfo && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-dark-800 mb-1">{classInfo.title}</h2>
            <p className="text-dark-500 text-sm">{formatDate(classInfo.date)}</p>
          </div>
        )}

        <div className="card">
          <div className="mb-6 pb-6 border-b border-dark-100">
            <h2 className="text-xl font-bold text-dark-800">Ocijenite tečaj</h2>
            <p className="text-dark-500 mt-1">Podijelite svoje iskustvo s nama.</p>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Ocjena *</label>
              <StarRating value={score} onChange={setScore} />
            </div>

            <div>
              <label htmlFor="comment" className="label">Komentar *</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                rows={5}
                className="input resize-none"
                placeholder="Opišite svoje iskustvo..."
                maxLength={1000}
              />
              <p className="text-dark-400 text-sm mt-1 text-right">
                {comment.length}/1000
              </p>
            </div>

            <div className="pt-4 border-t border-dark-100">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Slanje...
                  </span>
                ) : (
                  'Pošalji recenziju'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
