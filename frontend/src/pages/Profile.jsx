import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function parseJwt (token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
}

export default function Profile() {
  const [userData, setUserData] = useState(null)
  const [targetId, setTargetId] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/')
      return
    }
    const decoded = parseJwt(token)
    if (decoded && decoded.user_id) {
       fetchProfile(decoded.user_id)
    } else {
       fetchProfile(1) // fallback seguro para admin clássico
    }
  }, [navigate])

  const fetchProfile = async (idToFetch) => {
    setIsLoading(true)
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`/api/v1/users/?id=${idToFetch}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setUserData(data)
        setMessage(`Alvo Encontrado: ${data.detail}`)
      } else {
        setMessage(`Erro: ${data.detail || res.statusText}`)
      }
    } catch (err) {
      setMessage(`Falha na requisição da API: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleIdorSearch = (e) => {
    e.preventDefault()
    if (targetId) fetchProfile(targetId)
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/v1/profile/email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // <-- Força envio de cookies, essencial para o Lab CSRF
        body: JSON.stringify({ email: newEmail })
      })
      const data = await res.json()
      
      setMessage(`(CSRF Request) ${data.detail} Ação executada sobre a Sessão Logada!`)
      // Removemos a atualização visual automática do userData para não confundir o alvo do IDOR com a Vítima do CSRF
    } catch (err) {
      setMessage(`Erro na requisição: ${err.message}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    fetch('/api/csrf/session-logout/', { method: 'POST' }).catch(() => {})
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Painel Principal</h1>
            <p className="text-gray-400">Área Autenticada de Laboratório</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 border border-gray-700 bg-gray-900 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all font-semibold">
            Logout
          </button>
        </header>

        {message && (
          <div className="bg-gray-900 border-l-4 border-indigo-500 text-gray-300 px-4 py-3 rounded shadow-md font-mono text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* USER DATA CARD (IDOR TARGET) */}
          <div className="bg-gray-900 shadow-2xl border border-gray-800 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="text-indigo-400">🔍</span> Visualizar Conta (Alvo IDOR)
            </h2>
            <p className="text-sm text-gray-400 mb-6">Endpoint <code className="text-xs bg-gray-800 px-1 rounded">GET /api/v1/users/</code></p>
            
            {isLoading ? (
               <p className="text-gray-500 italic animate-pulse">Consultando banco de dados...</p>
            ) : userData?.user ? (
              <div className="space-y-4 font-mono text-sm">
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                  <span className="text-gray-500 block text-xs">ID Requisitado</span>
                  <span className="text-blue-400 text-lg">{userData.user.id}</span>
                </div>
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                  <span className="text-gray-500 block text-xs">Username</span>
                  <span className="text-gray-200">{userData.user.username}</span>
                </div>
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                  <span className="text-gray-500 block text-xs">Email</span>
                  <span className="text-emerald-400">{userData.user.email}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Vazio. Usuário não existe.</p>
            )}

            <div className="mt-8 pt-6 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Pesquisar outro ID via Requisição:</h3>
              <form onSubmit={handleIdorSearch} className="flex gap-2">
                <input 
                  type="number" 
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  placeholder="ID"
                  className="w-20 px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                />
                <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-600/30 to-blue-600/30 hover:from-indigo-600/50 hover:to-blue-600/50 border border-indigo-500/50 rounded-lg text-indigo-300 font-medium transition-all">
                  Enviar Endpoint GET
                </button>
              </form>
            </div>
          </div>

          {/* CSRF TARGET CARD */}
          <div className="bg-gray-900 shadow-2xl border border-gray-800 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="text-emerald-400">🛡️</span> Painel de Conta (Alvo CSRF)
            </h2>
            <p className="text-sm text-gray-400 mb-6">Endpoint <code className="text-xs bg-gray-800 px-1 rounded">POST /api/v1/profile/email/</code></p>

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Alterar Endereço de Email</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  placeholder="hacker@evil.com"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/40 hover:text-emerald-300 shadow hover:shadow-emerald-500/20 font-semibold py-3 rounded-lg transition-all">
                Enviar Requisição de Atualização
              </button>
            </form>
            <div className="mt-8 text-xs text-gray-500 bg-gray-950 p-4 rounded-lg border border-gray-800">
              <p>💡 <b>Laboratório:</b> Teste a interceptação deste POST para validar a presença de um campo CSRF Token válido sendo exigido pela versão Segura e ignorado pela Vulnerável.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
