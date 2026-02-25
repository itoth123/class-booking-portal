import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsNewPassword, setNeedsNewPassword] = useState(false)

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/admin')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (needsNewPassword) {
        await authService.completeNewPassword(email, password, newPassword)
        await login(email, newPassword)
      } else {
        await login(email, password)
      }
      navigate('/admin')
    } catch (err) {
      if (err.code === 'NewPasswordRequired') {
        setNeedsNewPassword(true)
        setError('Molimo postavite novu lozinku')
      } else {
        setError(err.message || 'Prijava nije uspjela')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-50">
      <div className="bg-dark-900 py-8 relative">
        <img
          src="/logo-white.png"
          alt="SiT Logo"
          className="h-32 absolute left-6 top-1/2 -translate-y-1/2"
        />
        <div className="max-w-md mx-auto text-center">
          <span className="text-white/80 text-3xl tracking-widest uppercase font-light">Administracija</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@email.com"
                  required
                  disabled={needsNewPassword}
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Lozinka</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                  disabled={needsNewPassword}
                />
              </div>

              {needsNewPassword && (
                <div>
                  <label htmlFor="newPassword" className="label">Nova lozinka</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="Unesite novu lozinku"
                    required
                    minLength={8}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Prijava...' : (needsNewPassword ? 'Postavi lozinku' : 'Prijavi se')}
              </button>
            </form>
          </div>

          <div className="text-center mt-4">
            <Link to="/" className="text-dark-400 hover:text-dark-600 text-sm transition-colors">
              ← Povratak na popis tečajeva
            </Link>
          </div>

          <p className="text-center text-dark-400 text-sm mt-6">
            © 2025 SiT - Obrt za poslovne usluge
          </p>
        </div>
      </div>
    </div>
  )
}
