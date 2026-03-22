import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Strona nie została znaleziona
        </h2>
        <p className="text-gray-500 mb-6">
          Strona, której szukasz, nie istnieje lub trwa aktualizacja serwisu.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Przekierowanie na stronę główną za {countdown}s...
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Strona główna
          </Link>
          <Link
            to="/logowanie"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  )
}
