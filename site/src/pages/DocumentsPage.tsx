import { useState } from 'react'
import { documents, documentCategories } from '../data/mockData'
import { FileIcon, DownloadIcon, SearchIcon } from '../components/ui/Icons'

export default function DocumentsPage() {
  const [activeCategory, setActiveCategory] = useState('Wszystkie')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = documents.filter((doc) => {
    const matchCategory =
      activeCategory === 'Wszystkie' || doc.category === activeCategory
    const matchSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <>
      {/* Page hero */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h1 className="text-4xl md:text-5xl font-semibold text-charcoal tracking-tight mb-4">
            Dokumenty
          </h1>
          <p className="text-lg text-slate max-w-xl">
            Regulaminy, protokoły i formularze do pobrania.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 py-20">
        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input
            type="text"
            placeholder="Szukaj dokumentu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-[8px] text-sm text-charcoal placeholder:text-outline border border-transparent focus:border-amber-container focus:outline-none transition-colors"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {documentCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-sage text-white'
                  : 'bg-cream-dark text-slate hover:bg-cream-medium'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Document list */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center">
              <p className="text-slate">
                Nie znaleziono dokumentów spełniających kryteria.
              </p>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-[24px] p-6 shadow-[0_12px_32px_rgba(45,52,54,0.05)] flex items-center gap-5 group hover:shadow-[0_16px_40px_rgba(45,52,54,0.08)] transition-shadow"
              >
                <div className="w-12 h-12 bg-sage-pale/30 rounded-[12px] flex items-center justify-center shrink-0">
                  <FileIcon className="w-6 h-6 text-sage" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-charcoal truncate">
                    {doc.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-outline">{doc.category}</span>
                    <span className="text-xs text-outline">
                      Dodano: {new Date(doc.date).toLocaleDateString('pl-PL')}
                    </span>
                    <span className="text-xs text-outline">{doc.size}</span>
                  </div>
                </div>

                <button className="shrink-0 w-10 h-10 bg-sage rounded-[10px] flex items-center justify-center text-white hover:bg-sage-light transition-colors">
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
