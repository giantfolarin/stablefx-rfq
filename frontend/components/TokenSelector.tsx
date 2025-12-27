'use client'

import { useState, useRef, useEffect } from 'react'
import { Token, TOKEN_LIST } from '@/lib/tokens'

interface TokenSelectorProps {
  selectedToken: Token
  onSelectToken: (token: Token) => void
  excludeToken?: Token
  disabled?: boolean
}

export default function TokenSelector({ selectedToken, onSelectToken, excludeToken, disabled }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const availableTokens = TOKEN_LIST.filter(
    token => !excludeToken || token.symbol !== excludeToken.symbol
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-lg">{selectedToken.icon}</span>
        <span className="font-medium text-slate-950">{selectedToken.symbol}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="py-2">
            {availableTokens.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  onSelectToken(token)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 flex items-start space-x-3 hover:bg-arc-50 transition-all duration-150 ${
                  token.symbol === selectedToken.symbol ? 'bg-arc-50' : ''
                }`}
              >
                <span className="text-2xl">{token.icon}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-950">{token.symbol}</span>
                    <span className="text-xs text-gray-500">{token.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{token.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
