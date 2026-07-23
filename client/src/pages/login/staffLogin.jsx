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
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#fef3c7_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900">Staff access</h1>
        <p className="mt-2 text-slate-600">Sign in with your staff credentials to manage orders.</p>

        <div className="mt-8 space-y-5">
          <Input label="Staff ID" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="staff001" />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={!staffId || !password} onClick={handleLogin}>Login</Button>
        </div>
      </div>
    </div>
  )
}
