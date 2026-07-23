import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/common/Button.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('player')

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.72),
            rgba(2,6,23,0.72)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">
        <div className="max-w-2xl">

          <h1 className="text-6xl font-extrabold">
  <span className="text-white">Welcome to </span>
  <span className="text-green-400">CricVerse</span>
</h1>

          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Please log in to continue and access your canteen services.
          </p>

          <div className="mt-10 w-full max-w-2xl rounded-[36px] border border-white/20 bg-white/10 p-10 backdrop-blur-2xl shadow-2xl">

            <div className="mt-8 grid grid-cols-2 gap-6">

              <button
                onClick={() => setRole('player')}
                className={`rounded-3xl border p-8 text-left transition-all duration-300 ${
                  role === 'player'
                    ? 'border-emerald-300 bg-emerald-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <h3 className="text-3xl font-bold">
                  👤 Player
                </h3>

                
              </button>

              <button
                onClick={() => setRole('staff')}
                className={`rounded-3xl border p-8 text-left transition-all duration-300 ${
                  role === 'staff'
                    ? 'border-emerald-300 bg-emerald-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <h3 className="text-3xl font-bold">
                  🧑‍🍳 Staff
                </h3>
              </button>

            </div>

            <Button
              className="mt-8 h-16 w-full rounded-2xl text-lg font-semibold"
              onClick={() => navigate(`/login/${role}`)}
            >
              Continue as {role === 'player' ? 'Player' : 'Staff'}
            </Button>

          </div>

        </div>
      </section>
    </main>
  )
}