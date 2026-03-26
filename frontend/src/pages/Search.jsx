import { useState } from 'react'

export default function Search() {
  const [query, setQuery] = useState('')
  const [htmlResult, setHtmlResult] = useState('')
  
  const handleSearch = async (e) => {
    e.preventDefault()
    if(!query) return;

    try {
      // O backend retorna HTML puro nesta rota vulnerável
      const res = await fetch(`/api/v1/search/?q=${encodeURIComponent(query)}`)
      const text = await res.text()
      // Real risk of Reflected XSS here:
      setHtmlResult(text)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8">
      <div className="pb-6 border-b border-gray-800">
          <h2 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <span className="text-yellow-500">⚡</span> Reflected XSS (Busca)
          </h2>
          <p className="text-gray-400 mt-2">Endpoint Alvo: <code className="bg-gray-800 px-2 py-1 rounded text-yellow-200">GET /api/v1/search/?q=</code></p>
      </div>
      
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-10 shadow-xl relative mt-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-4">
           <input 
             type="text"
             value={query}
             onChange={e => setQuery(e.target.value)}
             className="flex-1 px-4 py-4 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all text-lg font-mono placeholder:font-sans"
             placeholder='Test payload: <img src="x" onerror="alert(1)">'
           />
           <button type="submit" className="bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-600/30 px-8 py-4 rounded-lg font-bold transition whitespace-nowrap">
             Buscar na Base
           </button>
        </form>

        {htmlResult && (
          <div className="mt-10 border-t border-gray-800 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Resposta Direta do Backend (Renderizada Pelo React):</h3>
            
            {/* VULNERABILITY: Dangerously setting raw HTML allows XSS execution in React */}
            <div 
              className="bg-white p-6 rounded-lg text-gray-900 border-l-8 border-yellow-500 shadow-inner font-serif text-lg"
              dangerouslySetInnerHTML={{ __html: htmlResult }} 
            />
            
            <div className="mt-6 text-xs text-gray-500 bg-gray-950 p-4 border border-gray-800 rounded">
                💡 <b>Laboratório Hacker:</b> Pelo fato de usarmos a flag React <code>dangerouslySetInnerHTML</code>, o código HTML malicioso retornado pela APi não é escapado. O script que você inseriu na caixinha pode ser executado diretamente pelo motor do seu navegador se a API (Django) estiver com o modo Vulnerável ativo! 
                <br/><br/>
                <i>Nota: O React/HTML5 modernamente bloqueia tags de <code>&lt;script&gt;</code> injetadas no DOM dinamicamente, por isso exploits modernos usam payloads com Event Handlers, como o exemplo do erro de uma imagem acima.</i>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
