import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/common/Button.jsx'
import Input from '../../components/ui/common/Input.jsx'
import { loginStaff } from '../../services/api.js'

export default function StaffLoginPage() {
  const navigate = useNavigate()
  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    try {
      await loginStaff({ id: staffId, password })
      navigate('/staff')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to login.')
    }
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.74),
            rgba(2,6,23,0.74)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-6xl font-extrabold">
            <span className="text-white">Welcome to </span>
            <span className="text-green-400">CricVerse</span>
          </h1>

          <h2 className="mt-5 text-4xl font-bold text-white">Staff Access</h2>

          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Sign in with your staff credentials to manage orders, update status, and keep the canteen flow moving.
          </p>

          <div className="mt-10 rounded-[36px] border border-white/15 bg-slate-900/35 p-10 shadow-2xl backdrop-blur-2xl">
            <div className="space-y-7">
              <Input label="Staff ID" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="staff001" />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-rose-300">
                  {error}
                </div>
              )}

              <Button disabled={!staffId || !password} onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
