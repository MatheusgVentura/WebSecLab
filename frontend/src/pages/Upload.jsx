import { useState } from 'react'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState(null)
  const [uploadedData, setUploadedData] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setMessage("⚠️ Um arquivo é obrigatório.")
      return
    }

    setLoading(true)
    setMessage(null)
    setUploadedData(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/v1/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setUploadedData(data)
        setMessage(`Sucesso: ${data.detail}`)
      } else {
        setMessage(`Falha no Upload: ${data.detail}`)
      }
    } catch (err) {
      setMessage(`Erro crítico da rede: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8">
      <div className="pb-6 border-b border-gray-800">
          <h2 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <span className="text-purple-500">📁</span> Upload Inseguro
          </h2>
          <p className="text-gray-400 mt-2">Endpoint Alvo: <code className="bg-gray-800 px-2 py-1 rounded text-purple-200">POST /api/v1/upload/</code></p>
      </div>
      
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-10 shadow-xl mt-8">
        
        <form onSubmit={handleUpload} className="space-y-6 border-2 border-dashed border-gray-700 p-8 md:p-12 rounded-xl text-center bg-gray-950 hover:bg-gray-900 transition-colors group">
          <div className="flex flex-col items-center justify-center gap-6">
             <div className="w-24 h-24 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
               ☁️
             </div>
             <div>
               <label className="cursor-pointer bg-purple-600/20 text-purple-400 border border-purple-500/30 px-6 py-2 rounded-full font-bold hover:bg-purple-600/40 transition">
                 Selecionar Arquivo Físico
                 <input type="file" onChange={handleFileChange} className="hidden" />
               </label>
               <p className="text-gray-400 text-sm mt-4 font-mono font-semibold tracking-wide bg-gray-800 px-4 py-1 rounded-full w-max mx-auto">
                 {file ? `Selecionado: ${file.name}` : 'Nenhum payload em anexo'}
               </p>
             </div>
          </div>
          
          <button type="submit" disabled={loading || !file} className="mt-8 bg-purple-600 text-white hover:bg-purple-500 shadow-lg hover:shadow-purple-500/30 px-10 py-4 w-full md:w-auto rounded-lg font-bold transition disabled:opacity-50 mx-auto block uppercase tracking-wider">
            {loading ? 'Transmitindo Payload...' : 'Efetuar Upload no Servidor'}
          </button>
        </form>

        {message && (
          <div className={`mt-8 px-6 py-4 rounded-lg font-mono text-sm shadow-md border ${uploadedData ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
             {message}
          </div>
        )}

        {uploadedData && uploadedData.file_url && (
           <div className="mt-6 p-6 bg-gray-950 border border-gray-800 rounded-lg border-l-4 border-l-emerald-500 animate-in fade-in duration-500">
             <h4 className="text-gray-100 font-bold mb-4 text-lg">📁 Feedback do Armazenamento</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 font-mono">
               <div className="bg-gray-900 p-3 rounded">
                 <span className="text-gray-500 block mb-1">Nome final salvo (Bypass?):</span> 
                 <span className="text-emerald-400 break-all">{uploadedData.file_name}</span>
               </div>
               <div className="bg-gray-900 p-3 rounded">
                 <span className="text-gray-500 block mb-1">Content-Type capturado:</span> 
                 <span className="text-blue-400 break-all">{uploadedData.content_type}</span>
               </div>
               <div className="bg-gray-900 p-3 rounded md:col-span-2">
                 <span className="text-gray-500 block mb-1">URL Pública Clicável:</span> 
                 <a href={`http://localhost:8000${uploadedData.file_url}`} target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300 break-all">{uploadedData.file_url}</a>
               </div>
             </div>
             <div className="mt-6 text-xs text-gray-500 bg-gray-900 p-3 rounded">
                🤖 <b>Teoria de Exploração:</b> Tente fazer o upload de um arquivo como <code>shell.php</code>. A versão vulnerável da API preservará esta extensão perigosa e gerará o link, permitindo um RCE (Execução Remota) se estivesse num Apache. Na versão Segura da API, vai gerar erro, pois confere a White-List de extensões.
             </div>
           </div>
        )}

      </div>
    </div>
  )
}
