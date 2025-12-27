'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { RFQQuote } from '@/lib/rfq'

interface QuoteStoreContextType {
  quotes: RFQQuote[]
  addQuote: (quote: RFQQuote) => void
  removeQuote: (quote: RFQQuote) => void
  clearExpiredQuotes: () => void
}

const QuoteStoreContext = createContext<QuoteStoreContextType | undefined>(undefined)

const API_BASE = 'http://localhost:3001/api'
const LOCALSTORAGE_KEY = 'rfq_quotes_v1'

// ============================================================================
// LOCALSTORAGE HELPERS (Fallback when API is unavailable)
// ============================================================================

function loadQuotesFromStorage(): RFQQuote[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)

    // Convert serialized BigInt strings back to BigInt
    return parsed.map((item: any) => ({
      rfq: {
        ...item.rfq,
        amountIn: BigInt(item.rfq.amountIn),
        amountOut: BigInt(item.rfq.amountOut),
        nonce: BigInt(item.rfq.nonce),
        expiry: BigInt(item.rfq.expiry)
      },
      signature: item.signature
    }))
  } catch (error) {
    console.error('Failed to load quotes from localStorage:', error)
    return []
  }
}

function saveQuotesToStorage(quotes: RFQQuote[]): void {
  if (typeof window === 'undefined') return

  try {
    // Convert BigInt to strings for JSON serialization
    const serialized = quotes.map(quote => ({
      rfq: {
        ...quote.rfq,
        amountIn: quote.rfq.amountIn.toString(),
        amountOut: quote.rfq.amountOut.toString(),
        nonce: quote.rfq.nonce.toString(),
        expiry: quote.rfq.expiry.toString()
      },
      signature: quote.signature
    }))

    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(serialized))
    console.log('✅ Saved', serialized.length, 'quotes to localStorage')
  } catch (error) {
    console.error('Failed to save quotes to localStorage:', error)
  }
}

// ============================================================================
// API HELPERS (Used when backend is available)
// ============================================================================

function parseQuoteFromAPI(apiQuote: any): RFQQuote {
  return {
    rfq: {
      ...apiQuote.rfq,
      amountIn: BigInt(apiQuote.rfq.amountIn),
      amountOut: BigInt(apiQuote.rfq.amountOut),
      nonce: BigInt(apiQuote.rfq.nonce),
      expiry: BigInt(apiQuote.rfq.expiry)
    },
    signature: apiQuote.signature
  }
}

function serializeQuoteForAPI(quote: RFQQuote): any {
  return {
    rfq: {
      ...quote.rfq,
      amountIn: quote.rfq.amountIn.toString(),
      amountOut: quote.rfq.amountOut.toString(),
      nonce: quote.rfq.nonce.toString(),
      expiry: quote.rfq.expiry.toString()
    },
    signature: quote.signature
  }
}

// ============================================================================
// QUOTE STORE PROVIDER (Hybrid: API + localStorage fallback)
// ============================================================================

export function QuoteStoreProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<RFQQuote[]>([])
  const [apiAvailable, setApiAvailable] = useState<boolean>(false)
  const [isPolling, setIsPolling] = useState<boolean>(false)

  // Update quotes state and persist to localStorage
  const updateQuotes = useCallback((newQuotes: RFQQuote[]) => {
    setQuotes(newQuotes)
    saveQuotesToStorage(newQuotes)
  }, [])

  // Fetch quotes from API or localStorage (stable reference)
  const fetchQuotes = useCallback(async () => {
    // Prevent concurrent polling
    if (isPolling) {
      console.log('⏳ Skipping fetch - already polling')
      return
    }

    setIsPolling(true)

    try {
      const response = await fetch(`${API_BASE}/rfq/quotes`, {
        signal: AbortSignal.timeout(2000) // 2s timeout
      })

      if (response.ok) {
        const data = await response.json()
        const parsedQuotes = data.map(parseQuoteFromAPI)

        // Deduplicate by maker + nonce
        const uniqueQuotes = parsedQuotes.filter((quote: RFQQuote, index: number, self: RFQQuote[]) =>
          index === self.findIndex((q) =>
            q.rfq.maker.toLowerCase() === quote.rfq.maker.toLowerCase() &&
            q.rfq.nonce === quote.rfq.nonce
          )
        )

        if (!apiAvailable) {
          console.log('✅ API reconnected')
          setApiAvailable(true)
        }

        setQuotes(uniqueQuotes)
        saveQuotesToStorage(uniqueQuotes)
        console.log('✅ Loaded', uniqueQuotes.length, 'unique quotes from API')
        setIsPolling(false)
        return
      }
    } catch (error) {
      // API unavailable - fall back to localStorage
      if (apiAvailable) {
        console.warn('⚠️  API unavailable, falling back to localStorage')
        setApiAvailable(false)
      }
    }

    // Fallback: Load from localStorage
    const storedQuotes = loadQuotesFromStorage()
    setQuotes(storedQuotes)

    if (storedQuotes.length > 0) {
      console.log('📦 Loaded', storedQuotes.length, 'quotes from localStorage (API unavailable)')
    }

    setIsPolling(false)
  }, [apiAvailable, isPolling])

  // Load quotes on mount and poll every 3 seconds with stable interval
  useEffect(() => {
    fetchQuotes()

    // Use stable 3-second polling interval
    const interval = setInterval(() => {
      fetchQuotes()
    }, 3000)

    return () => {
      clearInterval(interval)
      console.log('🛑 Stopped RFQ polling')
    }
  }, []) // Empty deps - run once on mount

  // Add quote (try API first, fall back to localStorage)
  const addQuote = useCallback(async (quote: RFQQuote) => {
    try {
      const response = await fetch(`${API_BASE}/rfq/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeQuoteForAPI(quote)),
        signal: AbortSignal.timeout(2000)
      })

      if (response.ok) {
        console.log('✅ Quote created via API')
        await fetchQuotes()
        return
      }
    } catch (error) {
      console.warn('⚠️  API unavailable, saving quote to localStorage instead')
    }

    // Fallback: Add to localStorage
    const currentQuotes = loadQuotesFromStorage()
    const updatedQuotes = [...currentQuotes, quote]
    updateQuotes(updatedQuotes)
    console.log('✅ Quote saved to localStorage (API unavailable)')
  }, [fetchQuotes, updateQuotes])

  // Remove quote (try API first, fall back to localStorage)
  const removeQuote = useCallback(async (quote: RFQQuote) => {
    const maker = quote.rfq.maker
    const nonce = quote.rfq.nonce.toString()

    try {
      const response = await fetch(`${API_BASE}/rfq/quotes/${maker}/${nonce}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(2000)
      })

      if (response.ok || response.status === 204) {
        console.log('✅ Quote removed via API')
        await fetchQuotes()
        return
      }
    } catch (error) {
      console.warn('⚠️  API unavailable, removing quote from localStorage instead')
    }

    // Fallback: Remove from localStorage
    const currentQuotes = loadQuotesFromStorage()
    const updatedQuotes = currentQuotes.filter(q =>
      !(q.rfq.maker.toLowerCase() === maker.toLowerCase() && q.rfq.nonce === quote.rfq.nonce)
    )
    updateQuotes(updatedQuotes)
    console.log('✅ Quote removed from localStorage (API unavailable)')
  }, [fetchQuotes, updateQuotes])

  // Clear expired quotes
  const clearExpiredQuotes = useCallback(async () => {
    const now = BigInt(Math.floor(Date.now() / 1000))

    try {
      await fetch(`${API_BASE}/rfq/quotes/cleanup`, {
        method: 'POST',
        signal: AbortSignal.timeout(2000)
      })
      await fetchQuotes()
      return
    } catch (error) {
      // API unavailable - clean up locally
    }

    // Fallback: Clean up localStorage
    const currentQuotes = loadQuotesFromStorage()
    const validQuotes = currentQuotes.filter(q => q.rfq.expiry > now)

    if (validQuotes.length < currentQuotes.length) {
      updateQuotes(validQuotes)
      console.log(`🧹 Removed ${currentQuotes.length - validQuotes.length} expired quotes from localStorage`)
    }
  }, [fetchQuotes, updateQuotes])

  return (
    <QuoteStoreContext.Provider value={{ quotes, addQuote, removeQuote, clearExpiredQuotes }}>
      {children}
    </QuoteStoreContext.Provider>
  )
}

export function useQuoteStore() {
  const context = useContext(QuoteStoreContext)
  if (!context) {
    throw new Error('useQuoteStore must be used within QuoteStoreProvider')
  }
  return context
}
