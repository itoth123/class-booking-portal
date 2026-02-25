import { Link, useLocation, Navigate } from 'react-router-dom'

export default function BookingSuccess() {
  const location = useLocation()
  const { className, bookingId, firstName } = location.state || {}

  if (!bookingId) {
    return <Navigate to="/" />
  }

  return (
    <div className="min-h-screen bg-dark-50">
      <header className="bg-dark-900 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src="/logo-white.png" alt="SiT Logo" className="h-12" />
          <span className="text-dark-500">|</span>
          <h1 className="text-lg font-semibold text-white">Rezervacija potvrđena</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="card text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-dark-800 mb-2">
            Hvala{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="text-dark-600 text-lg mb-2">
            Vaša rezervacija za <strong>{className}</strong> je zaprimljena.
          </p>
          <p className="text-dark-500 text-sm mb-2">
            Rezervacija je na čekanju dok administrator ne potvrdi uplatu.
          </p>
          <p className="text-dark-400 text-sm mb-8">
            Broj rezervacije: <span className="font-mono text-dark-600">{bookingId}</span>
          </p>

          <Link to="/" className="btn-primary">
            Povratak na popis tečajeva
          </Link>
        </div>
      </main>
    </div>
  )
}
