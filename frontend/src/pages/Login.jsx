import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [labMode, setLabMode] = useState('Vulnerável')
  
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/lab/mode/')
      .then(res => res.json())
      .then(data => {
        if(data.lab_mode) {
           setLabMode(data.lab_mode === 'secure' ? 'Seguro' : 'Vulnerável')
        }
      })
      .catch(err => console.error("Error fetching lab mode:", err))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const loginRes = await fetch('/api/v1/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const loginData = await loginRes.json()

      if (!loginRes.ok || !loginData.authenticated) {
        throw new Error(loginData.detail || 'Credenciais inválidas.')
      }

      // NOVO FLUXO: JWT já vem no payload do login bypassado/seguro
      if (!loginData.access) {
        throw new Error("Bypass aceito pelo Banco, mas falha interna do backend ao forjar JWT do Alvo.")
      }

      await fetch('/api/csrf/session-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).catch(() => {}) 

      localStorage.setItem('access_token', loginData.access)
      localStorage.setItem('refresh_token', loginData.refresh)
      
      setSuccess(`${loginData.detail} (Sessão Hacked! Entrando...)`)
      
      setTimeout(() => navigate('/lab/profile'), 1200)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 font-sans text-gray-100 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-indigo-600 rounded-full blur-[80px] opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-blue-600 rounded-full blur-[80px] opacity-30 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 mb-2">WebSecLab</h1>
          <p className="text-gray-400 text-sm">Laboratório de Segurança Ofensiva</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-sm px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="username">Usuário</label>
            <input 
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
              placeholder="admin' --"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all outline-none flex items-center justify-center mt-2"
          >
            {loading ? 'Autenticando API...' : 'Acessar Laboratório'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center relative z-10">
          <p className="text-sm text-gray-400">
            Ainda não tem conta alvos?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Registrar nova vítima
            </Link>
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500 relative z-10 font-mono">
            <span className={`w-2 h-2 rounded-full animate-pulse ${labMode === 'Seguro' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span>API MODE: <span className={`font-semibold ${labMode === 'Seguro' ? 'text-emerald-400' : 'text-red-400'}`}>{labMode}</span></span>
        </div>
      </div>
    </div>
  )
}
