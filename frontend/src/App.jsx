import { BrowserRouter, Routes, Route, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Upload from './pages/Upload'

function LabLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    fetch('/api/csrf/session-logout/', { method: 'POST' }).catch(() => {})
    navigate('/')
  }

  const getLinkClasses = (path) => {
    const isActive = location.pathname.includes(path)
    return `px-4 py-3 xl:py-2 rounded-lg border flex items-center gap-2 transition-all font-medium ${
      isActive 
      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' 
      : 'border-gray-800 bg-gray-950/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 flex flex-col md:flex-row">
      <nav className="w-full md:w-72 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 p-6 flex flex-col shadow-2xl z-10 md:sticky top-0 h-auto md:h-screen">
        <div className="mb-8 hidden md:block">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 tracking-tight">WebSecLab</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-mono">Hacker Terminal</p>
        </div>
        
        <div className="flex flex-row md:flex-col gap-3 flex-grow overflow-x-auto md:overflow-visible pb-4 md:pb-0">
          <Link to="/lab/profile" className={getLinkClasses('profile')}>
            <span>👤</span> Perfil (IDOR/CSRF)
          </Link>
          <Link to="/lab/search" className={getLinkClasses('search')}>
            <span>⚡</span> Busca (XSS)
          </Link>
          <Link to="/lab/upload" className={getLinkClasses('upload')}>
            <span>📁</span> Upload (Malware)
          </Link>
        </div>

        <button onClick={handleLogout} className="mt-4 md:mt-0 px-4 py-3 border border-gray-700 bg-gray-800 text-gray-300 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all font-bold flex items-center justify-center gap-2">
          <span>🚪</span> Desconectar
        </button>
      </nav>
      
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/lab" element={<LabLayout />}>
           <Route path="profile" element={<Profile />} />
           <Route path="search" element={<Search />} />
           <Route path="upload" element={<Upload />} />
        </Route>

        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
