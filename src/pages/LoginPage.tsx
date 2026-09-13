import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

const DEMO_ACCOUNTS = [
  { email: 'admin@example.com', label: 'Admin — Ada' },
  { email: 'priya.manager@example.com', label: 'Manager — Priya' },
  { email: 'sara.member@example.com', label: 'Team member — Sara' },
]
const DEMO_PASSWORD = 'Demo1234!'

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(nextEmail: string, nextPassword: string) {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(nextEmail, nextPassword)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Task &amp; Engagement Management</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit(email, password)
          }}
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         focus:border-slate-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white
                       hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Demo accounts
          </p>
          <div className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(DEMO_PASSWORD)
                  void submit(account.email, DEMO_PASSWORD)
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm
                           hover:bg-slate-50"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
