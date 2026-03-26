import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao registrar usuário. Username Indisponível?')
      }

      setIsSuccess(true)
      setMessage(`${data.detail}`)
      
      setTimeout(() => navigate('/'), 1500)

    } catch (err) {
      setMessage(err.message)
      setIsSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 font-sans text-gray-100 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-emerald-600 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">Novo Alvo</h1>
          <p className="text-gray-400 text-sm">Cadastre um usuário teste de laboratório.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5 relative z-10">
          {message && (
             <div className={`text-sm px-4 py-3 rounded-lg ${isSuccess ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border border-red-500/50 text-red-500'}`}>
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="username">Username (Vítima)</label>
            <input 
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              placeholder="Ex: joao_silva"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="joao@hackme.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Senha Simples</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="123456"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all outline-none mt-4 flex justify-center"
          >
            {loading ? 'Cadastrando Database...' : 'Finalizar Registro'}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10 border-t border-gray-800 pt-6">
          <Link to="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            &larr; Voltar para a Tela de Login
          </Link>
        </div>
      </div>
    </div>
  )
}
