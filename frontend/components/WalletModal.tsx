'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@/contexts/WalletContext'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

interface WalletOption {
  name: string
  icon: string
  installed: boolean
  connect: () => Promise<void>
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectWallet } = useWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      return mobileRegex.test(userAgent.toLowerCase())
    }
    setIsMobile(checkMobile())
  }, [])

  // Store EIP-6963 discovered providers
  const [eip6963Providers, setEip6963Providers] = useState<Map<string, any>>(new Map())

  // Ensure component only renders on client + EIP-6963 provider discovery
  useEffect(() => {
    setMounted(true)

    // EIP-6963: Modern wallet detection standard (solves multi-wallet conflicts)
    const discoveredProviders = new Map()

    const handleProviderAnnouncement = (event: any) => {
      const { info, provider } = event.detail
      console.log('📢 EIP-6963 Provider announced:', info.name, info)
      discoveredProviders.set(info.uuid, { info, provider })
      setEip6963Providers(new Map(discoveredProviders))
    }

    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    // DEBUG: Log all detected providers
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('🔍 WALLET DETECTION DEBUG:')
      console.log('='.repeat(50))
      console.log('window.ethereum exists:', !!window.ethereum)

      if (window.ethereum.providers) {
        console.log('Multiple providers detected:', window.ethereum.providers.length)
        window.ethereum.providers.forEach((p: any, i: number) => {
          console.log(`\nProvider ${i}:`, {
            isMetaMask: p.isMetaMask,
            isRabby: p.isRabby,
            isCoinbaseWallet: p.isCoinbaseWallet,
            isOkxWallet: p.isOkxWallet,
            isPhantom: p.isPhantom,
            isTrust: p.isTrust
          })
        })

        // Specific MetaMask check
        const metamaskInArray = window.ethereum.providers.find((p: any) =>
          p.isMetaMask && !p.isRabby
        )
        console.log('\n🦊 MetaMask specifically:', metamaskInArray ? '✅ FOUND' : '❌ NOT FOUND')
        if (metamaskInArray) {
          console.log('   MetaMask provider:', metamaskInArray)
        }
      } else {
        console.log('Single provider (no providers array)')
        console.log('window.ethereum:', {
          isMetaMask: window.ethereum.isMetaMask,
          isRabby: window.ethereum.isRabby,
          isCoinbaseWallet: window.ethereum.isCoinbaseWallet
        })

        // Check if this single provider is MetaMask
        if (window.ethereum.isMetaMask && !window.ethereum.isRabby) {
          console.log('🦊 MetaMask: ✅ FOUND (single provider)')
        } else {
          console.log('🦊 MetaMask: ❌ NOT FOUND')
        }
      }

      // Check custom injection points
      console.log('\nCustom injections:', {
        'window.MetaMask': !!(window as any).MetaMask,
        'window.okxwallet': !!(window as any).okxwallet,
        'window.phantom.ethereum': !!(window as any).phantom?.ethereum,
        'window.backpack': !!(window as any).backpack,
        'window.keplr': !!(window as any).keplr
      })
      console.log('='.repeat(50))
    }

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement)
    }
  }, [])

  // DEBUG: Visual diagnostic for MetaMask detection
  // MUST be called before early return (React hooks rule)
  const metamaskDiagnostic = useMemo(() => {
    if (typeof window === 'undefined' || !window.ethereum) return { found: false, reason: 'No window.ethereum' }

    const providers = window.ethereum.providers || [window.ethereum]
    const metamaskProvider = providers.find((p: any) => p.isMetaMask && !p.isRabby)

    if (metamaskProvider) return { found: true, reason: 'Found in providers array' }
    if (!window.ethereum.providers && window.ethereum.isMetaMask && !window.ethereum.isRabby) {
      return { found: true, reason: 'Single provider' }
    }

    return {
      found: false,
      reason: `Not found. Providers: ${providers.length}, Flags: ${JSON.stringify(providers.map((p: any) => ({ mm: p.isMetaMask, rb: p.isRabby })))}`
    }
  }, [mounted])

  if (!isOpen || !mounted) return null

  // Get wallet installation URLs
  const getWalletInstallUrl = (walletName: string): string => {
    const urls: Record<string, string> = {
      'MetaMask': 'https://metamask.io/download/',
      'Rabby Wallet': 'https://rabby.io/',
      'Rainbow': 'https://rainbow.me/',
      'Coinbase Wallet': 'https://www.coinbase.com/wallet',
      'OKX Wallet': 'https://www.okx.com/web3',
      'Phantom': 'https://phantom.app/',
      'Backpack': 'https://backpack.app/',
      'Keplr': 'https://www.keplr.app/',
      'Trust Wallet': 'https://trustwallet.com/',
      'WalletConnect': 'https://walletconnect.com/'
    }
    return urls[walletName] || 'https://ethereum.org/en/wallets/'
  }

  // Check if wallet supports Ethereum/EVM (not just installed)
  const walletSupportsEthereum = (walletName: string): boolean => {
    const win = window as any

    switch (walletName) {
      case 'Keplr':
        // Keplr is Cosmos-native, EVM support is experimental and often broken
        // Only show as installed if it has ethereum property
        return !!(win.keplr?.ethereum)

      case 'Backpack':
        // Backpack is Solana-native, no reliable EVM support
        // Only show if it explicitly exposes ethereum provider
        return !!(win.backpack?.ethereum)

      default:
        return true  // All other wallets are EVM-native
    }
  }

  // Resolve the specific provider for a wallet (CRITICAL for multi-wallet support)
  const getProviderForWallet = (walletName: string): any | null => {
    if (typeof window === 'undefined') return null

    // Get all EIP-1193 providers
    const ethereumProviders = window.ethereum?.providers || (window.ethereum ? [window.ethereum] : [])
    const win = window as any

    switch (walletName) {
      case 'Rabby Wallet':
        return ethereumProviders.find((p: any) => p.isRabby === true) || null

      case 'MetaMask':
        // PRODUCTION FIX: Robust MetaMask detection with multi-wallet conflict resolution
        // Problem: Rabby and other wallets set isMetaMask=true for compatibility
        // Solution: Use EIP-6963 provider discovery (modern standard)

        // Strategy 1: EIP-6963 Provider Discovery (BEST - solves all conflicts)
        // Check if MetaMask announced itself via EIP-6963
        const eip6963Array = Array.from(eip6963Providers.values())
        const eip6963MetaMask = eip6963Array.find(({ info }) =>
          info.name.toLowerCase().includes('metamask')
        )
        if (eip6963MetaMask) {
          console.log('✅ MetaMask found via EIP-6963:', eip6963MetaMask.info.name, eip6963MetaMask.info.rdns)
          return eip6963MetaMask.provider
        }

        // Strategy 2: Check window.MetaMask (MetaMask's dedicated injection point)
        // This exists even when Rabby/Backpack override window.ethereum
        const dedicatedMetaMask = (window as any).MetaMask
        if (dedicatedMetaMask && typeof dedicatedMetaMask.request === 'function') {
          console.log('✅ MetaMask found at window.MetaMask (dedicated injection)')
          return dedicatedMetaMask
        }

        // Strategy 3: Check providers array for genuine MetaMask
        const metamaskProvider = ethereumProviders.find((p: any) =>
          p.isMetaMask === true &&
          p.isRabby !== true &&
          !p._isRabby && // Some versions use _isRabby
          p.constructor?.name !== 'RabbyProvider' && // Check constructor name
          p.constructor?.name !== 'BackpackProvider' // Filter Backpack
        )

        if (metamaskProvider) {
          console.log('✅ MetaMask found in providers array:', metamaskProvider.constructor?.name || 'MetaMask')
          return metamaskProvider
        }

        // Strategy 4: Check window.ethereum directly (only if it's the sole provider AND genuinely MetaMask)
        if (!window.ethereum?.providers &&
            window.ethereum?.isMetaMask &&
            !window.ethereum?.isRabby &&
            !window.ethereum?._isRabby &&
            !window.ethereum?.isBackpack) {
          console.log('✅ MetaMask found as single provider')
          return window.ethereum
        }

        console.warn('❌ MetaMask not detected - ensure extension is installed and enabled')
        console.warn('   If MetaMask is installed, try disabling other wallet extensions temporarily')
        console.warn('   EIP-6963 providers found:', Array.from(eip6963Providers.values()).map(p => p.info.name))
        return null

      case 'OKX Wallet':
        // OKX injects at window.okxwallet with EIP-1193 interface
        if (win.okxwallet) return win.okxwallet
        return ethereumProviders.find((p: any) => p.isOkxWallet === true) || null

      case 'Phantom':
        // Phantom injects at window.phantom.ethereum for EVM
        // Also check providers array as fallback
        if (win.phantom?.ethereum) return win.phantom.ethereum
        const phantomProvider = ethereumProviders.find((p: any) => p.isPhantom === true)
        if (phantomProvider) {
          console.log('✅ Phantom found in providers array')
          return phantomProvider
        }
        console.warn('❌ Phantom not detected or EVM support not available')
        return null

      case 'Coinbase Wallet':
        return ethereumProviders.find((p: any) => p.isCoinbaseWallet === true) || null

      case 'Rainbow':
        return ethereumProviders.find((p: any) => p.isRainbow === true) || null

      case 'Backpack':
        // Backpack is Solana-first, EVM support is secondary/unstable
        // Try custom injection first, then check providers array
        if (win.backpack?.ethereum) return win.backpack.ethereum
        const backpackProvider = ethereumProviders.find((p: any) => p.isBackpack === true)
        if (backpackProvider) {
          console.log('✅ Backpack found in providers array')
          return backpackProvider
        }
        console.warn('❌ Backpack not detected or EVM support not available')
        return null

      case 'Keplr':
        // Keplr is Cosmos-first, EVM via separate API
        // Try custom injection first, then check providers array
        if (win.keplr?.ethereum) return win.keplr.ethereum
        const keplrProvider = ethereumProviders.find((p: any) => p.isKeplr === true)
        if (keplrProvider) {
          console.log('✅ Keplr found in providers array')
          return keplrProvider
        }
        console.warn('❌ Keplr not detected or EVM support not available')
        return null

      case 'Trust Wallet':
        return ethereumProviders.find((p: any) => p.isTrust === true) || null

      default:
        return null
    }
  }

  // Comprehensive EIP-1193 wallet detection (must support Ethereum)
  const detectWallet = (walletName: string): boolean => {
    const provider = getProviderForWallet(walletName)

    // Provider must exist AND support Ethereum
    if (!provider) return false

    // Additional check for multi-chain wallets
    if (!walletSupportsEthereum(walletName)) {
      console.warn(`${walletName} installed but does not support Ethereum`)
      return false
    }

    return true
  }

  // CRITICAL: Map wallet selection to specific provider
  const handleConnectWallet = async (walletName: string) => {
    console.log(`🔌 User clicked: ${walletName}`)

    // Step 1: Resolve the EXACT provider for this wallet
    const selectedProvider = getProviderForWallet(walletName)

    if (!selectedProvider) {
      console.error(`❌ ${walletName} provider not found`, {
        windowEthereum: !!window.ethereum,
        providers: window.ethereum?.providers?.map((p: any) => ({
          isRabby: p.isRabby,
          isMetaMask: p.isMetaMask,
          isOKX: p.isOkxWallet
        }))
      })
      alert(
        `${walletName} is not installed or does not support Ethereum.\n\n` +
        `Please ensure:\n` +
        `• The browser extension is installed\n` +
        `• The extension is enabled\n` +
        `• The wallet supports Ethereum/EVM chains`
      )
      return
    }

    // Step 2: Verify provider has required methods
    if (!selectedProvider.request && !selectedProvider.send) {
      console.error(`❌ ${walletName} provider missing EIP-1193 methods`, selectedProvider)
      alert(`${walletName} is installed but is not compatible with this app (missing EIP-1193 support).`)
      return
    }

    console.log(`✅ Provider resolved for ${walletName}:`, {
      provider: selectedProvider,
      isRabby: selectedProvider.isRabby,
      isMetaMask: selectedProvider.isMetaMask,
      isOKX: selectedProvider.isOkxWallet,
      hasRequest: !!selectedProvider.request,
      hasSend: !!selectedProvider.send
    })

    setIsConnecting(true)
    try {
      // Pass the SPECIFIC provider to WalletContext
      console.log(`📡 Calling connectWallet() with ${walletName} provider...`)
      await connectWallet(selectedProvider)
      console.log(`✅ Successfully connected ${walletName}`)
      onClose()
    } catch (error: any) {
      console.error(`❌ Failed to connect ${walletName}:`, error)

      // User-friendly error messages
      let errorMessage = `Failed to connect ${walletName}.`

      if (error.code === 4001) {
        errorMessage = 'You rejected the connection request.'
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Connection request was rejected.'
      } else if (error.message) {
        errorMessage = `${walletName} error: ${error.message}`
      }

      alert(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }

  // Define wallet metadata (static - never changes)
  const walletDefinitions = [
    {
      name: 'Rabby Wallet',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0idXJsKCNncmFkKSIvPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCIgeTE9IjAiIHgyPSI0OCIgeTI9IjQ4Ij4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6Izc4OEFGRjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOEM2REZGO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHBhdGggZD0iTTM1IDE5QzM1IDE1LjcgMzIuMyAxMyAyOSAxM0MyOCAxMiAxOSAxMyAxNSAxN0MxMCAyMSAxMCAyNyAxNSAzMEMyMCAzMyAyOCAzMyAzMSAzMUMzNCAyOSAzNSAyNyAzNSAyNFYxOVoiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iMjgiIGN5PSIxOSIgcj0iMi41IiBmaWxsPSIjNzg4QUZGIi8+CiAgPHBhdGggZD0iTTE5IDIyQzE5IDIyIDIwIDI1IDI0IDI1QzI4IDI1IDI5IDIyIDI5IDIyIiBzdHJva2U9IiM3ODhBRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg=='
    },
    { name: 'MetaMask', icon: '🦊' },
    { name: 'OKX Wallet', icon: '⭕' },
    { name: 'Phantom', icon: '👻' },
    { name: 'Coinbase Wallet', icon: '🔵' },
    { name: 'Rainbow', icon: '🌈' },
    { name: 'Trust Wallet', icon: '🛡️' },
    { name: 'Backpack', icon: '🎒' },
    { name: 'Keplr', icon: '⚛️' }
  ]

  // Build wallet list with installation status (recomputed when eip6963Providers changes)
  const wallets: WalletOption[] = useMemo(() => {
    return walletDefinitions.map(def => ({
      ...def,
      installed: detectWallet(def.name),
      connect: async () => handleConnectWallet(def.name)
    }))
  }, [eip6963Providers])

  const installedWallets = wallets.filter(w => w.installed)
  const popularWallets = wallets.filter(w => !w.installed)

  // Mobile wallet deep links
  const openInMetaMaskMobile = () => {
    const currentUrl = window.location.href
    const metamaskDeepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`
    window.location.href = metamaskDeepLink
  }

  const openInRabbyMobile = () => {
    const currentUrl = window.location.href
    const rabbyDeepLink = `https://rabby.io/dapp?url=${encodeURIComponent(currentUrl)}`
    window.location.href = rabbyDeepLink
  }

  const openInCoinbaseMobile = () => {
    const currentUrl = window.location.href
    const coinbaseDeepLink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`
    window.location.href = coinbaseDeepLink
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-[#111827] border border-[#374151] rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-[#374151] bg-[#161E2E] flex-shrink-0">
          <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-bold text-[#E5E7EB]">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors p-1.5 sm:p-2"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Panel - Wallet List (Scrollable) */}
          <div className="w-full md:w-1/2 md:border-r border-[#374151] flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
              {isMobile ? (
                // Mobile Wallet Options
                <div className="space-y-4">
                  <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-3 mb-4">
                    <p className="text-[12px] text-[#93C5FD] font-medium">
                      📱 To connect on mobile, open this site in your wallet app's browser
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[1px] mb-3">Open in Wallet</h3>
                    <div className="space-y-2">
                      <button
                        onClick={openInMetaMaskMobile}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 bg-[#161E2E] border border-[#374151] hover:bg-[#1F2937] hover:border-[#4B5563] rounded-lg transition-all duration-150 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">🦊</span>
                          <div className="text-left">
                            <div className="text-[#E5E7EB] font-medium text-[13px]">MetaMask</div>
                            <div className="text-[#6B7280] text-[11px]">Open in MetaMask app</div>
                          </div>
                        </div>
                        <span className="text-[#3B82F6] text-[11px] font-medium">Open →</span>
                      </button>

                      <button
                        onClick={openInCoinbaseMobile}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 bg-[#161E2E] border border-[#374151] hover:bg-[#1F2937] hover:border-[#4B5563] rounded-lg transition-all duration-150 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">🔵</span>
                          <div className="text-left">
                            <div className="text-[#E5E7EB] font-medium text-[13px]">Coinbase Wallet</div>
                            <div className="text-[#6B7280] text-[11px]">Open in Coinbase app</div>
                          </div>
                        </div>
                        <span className="text-[#3B82F6] text-[11px] font-medium">Open →</span>
                      </button>

                      <button
                        onClick={openInRabbyMobile}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 bg-[#161E2E] border border-[#374151] hover:bg-[#1F2937] hover:border-[#4B5563] rounded-lg transition-all duration-150 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0idXJsKCNncmFkKSIvPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCIgeTE9IjAiIHgyPSI0OCIgeTI9IjQ4Ij4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6Izc4OEFGRjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOEM2REZGO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHBhdGggZD0iTTM1IDE5QzM1IDE1LjcgMzIuMyAxMyAyOSAxM0MyOCAxMiAxOSAxMyAxNSAxN0MxMCAyMSAxMCAyNyAxNSAzMEMyMCAzMyAyOCAzMyAzMSAzMUMzNCAyOSAzNSAyNyAzNSAyNFYxOVoiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iMjgiIGN5PSIxOSIgcj0iMi41IiBmaWxsPSIjNzg4QUZGIi8+CiAgPHBhdGggZD0iTTE5IDIyQzE5IDIyIDIwIDI1IDI0IDI1QzI4IDI1IDI5IDIyIDI5IDIyIiBzdHJva2U9IiM3ODhBRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==" alt="Rabby" className="w-7 h-7 rounded-lg flex-shrink-0" />
                          <div className="text-left">
                            <div className="text-[#E5E7EB] font-medium text-[13px]">Rabby Wallet</div>
                            <div className="text-[#6B7280] text-[11px]">Open in Rabby app</div>
                          </div>
                        </div>
                        <span className="text-[#3B82F6] text-[11px] font-medium">Open →</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#374151]">
                    <h3 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-[1px] mb-3">Don't have a wallet?</h3>
                    <div className="space-y-2">
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1F2937]/50 border border-[#1F2937] hover:border-[#374151] rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg opacity-50 group-hover:opacity-80">🦊</span>
                          <span className="text-[#9CA3AF] text-[13px]">Get MetaMask</span>
                        </div>
                        <span className="text-[10px] text-[#6B7280] group-hover:text-[#93C5FD]">Install →</span>
                      </a>
                      <a
                        href="https://www.coinbase.com/wallet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1F2937]/50 border border-[#1F2937] hover:border-[#374151] rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg opacity-50 group-hover:opacity-80">🔵</span>
                          <span className="text-[#9CA3AF] text-[13px]">Get Coinbase Wallet</span>
                        </div>
                        <span className="text-[10px] text-[#6B7280] group-hover:text-[#93C5FD]">Install →</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                // Desktop Wallet Options
                <>
                  {/* Installed Wallets */}
                  {installedWallets.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-[10px] sm:text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[1px] mb-3 sm:mb-4">Installed</h3>
                      <div className="space-y-2">
                        {installedWallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={wallet.connect}
                            disabled={isConnecting}
                            className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#161E2E] border border-[#374151] hover:bg-[#1F2937] hover:border-[#4B5563] rounded-lg sm:rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                          >
                            {wallet.icon.startsWith('http') || wallet.icon.startsWith('data:') ? (
                              <img src={wallet.icon} alt={wallet.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0" />
                            ) : (
                              <span className="text-xl sm:text-2xl flex-shrink-0">{wallet.icon}</span>
                            )}
                            <span className="text-[#E5E7EB] font-medium text-[13px] sm:text-[14px]">{wallet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Wallets (Not Installed) */}
                  {popularWallets.length > 0 && (
                    <div>
                      <h3 className="text-[10px] sm:text-[11px] font-semibold text-[#6B7280] uppercase tracking-[1px] mb-3 sm:mb-4">Popular</h3>
                      <div className="space-y-2">
                        {popularWallets.map((wallet) => (
                          <a
                            key={wallet.name}
                            href={getWalletInstallUrl(wallet.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-[#1F2937]/50 border border-[#1F2937] hover:border-[#374151] rounded-lg sm:rounded-xl transition-all duration-150 group active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              {wallet.icon.startsWith('http') || wallet.icon.startsWith('data:') ? (
                                <img src={wallet.icon} alt={wallet.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg opacity-50 group-hover:opacity-80 transition-opacity flex-shrink-0" />
                              ) : (
                                <span className="text-xl sm:text-2xl opacity-50 group-hover:opacity-80 transition-opacity flex-shrink-0">{wallet.icon}</span>
                              )}
                              <span className="text-[#9CA3AF] font-medium text-[13px] sm:text-[14px]">{wallet.name}</span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-[#6B7280] group-hover:text-[#93C5FD] transition-colors font-medium flex-shrink-0">Get →</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Information (Hidden on mobile) */}
          <div className="hidden md:flex md:w-1/2 p-6 lg:p-8 bg-[#161E2E]/50 flex-col">
            <h3 className="text-[18px] lg:text-[20px] font-bold text-[#E5E7EB] mb-4 lg:mb-6 tracking-tight">What is a Wallet?</h3>

            <div className="space-y-4 lg:space-y-6">
              {/* Info Block 1 */}
              <div className="flex gap-3 lg:gap-4">
                <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-[#3B82F6] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[#E5E7EB] font-semibold mb-1.5 lg:mb-2 text-[13px] lg:text-[14px]">A Home for your Digital Assets</h4>
                  <p className="text-[#9CA3AF] text-[13px] lg:text-[14px] leading-relaxed">
                    Wallets are used to send, receive, store, and display digital assets like stablecoins and tokens.
                  </p>
                </div>
              </div>

              {/* Info Block 2 */}
              <div className="flex gap-3 lg:gap-4">
                <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-[#3B82F6] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[#E5E7EB] font-semibold mb-1.5 lg:mb-2 text-[13px] lg:text-[14px]">A New Way to Log In</h4>
                  <p className="text-[#9CA3AF] text-[13px] lg:text-[14px] leading-relaxed">
                    Instead of creating new accounts and passwords on every website, just connect your wallet.
                  </p>
                </div>
              </div>

              {/* Get a Wallet Links */}
              <div className="pt-4 lg:pt-6 flex gap-2 lg:gap-3">
                <a
                  href="https://ethereum.org/en/wallets/find-wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 lg:px-6 py-2.5 lg:py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-[13px] lg:text-[14px] rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-[#3B82F6]/20"
                >
                  Get a Wallet
                </a>
                <a
                  href="https://ethereum.org/en/wallets/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 lg:px-6 py-2.5 lg:py-3 text-[#93C5FD] hover:text-[#BFDBFE] font-semibold text-[13px] lg:text-[14px] transition-colors hover:bg-[#3B82F6]/10 rounded-xl underline"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-[#0B0F14] border-t border-[#374151] flex-shrink-0">
          <p className="text-[10px] sm:text-[11px] text-[#6B7280] text-center font-mono">
            <span className="hidden sm:inline">Institutional RFQ Trading on Arc L1 • USDC-Native Gas • PVP Settlement</span>
            <span className="sm:hidden">RFQ Trading on Arc L1</span>
          </p>
          {/* DEBUG: MetaMask Detection Status */}
          <p className="text-[10px] sm:text-[11px] mt-1.5 sm:mt-2 text-center font-mono" style={{ color: metamaskDiagnostic.found ? '#34D399' : '#F87171' }}>
            <span className="hidden sm:inline">🦊 MetaMask: {metamaskDiagnostic.found ? '✅ DETECTED' : '❌ NOT DETECTED'} - {metamaskDiagnostic.reason}</span>
            <span className="sm:hidden">🦊 {metamaskDiagnostic.found ? '✅' : '❌'} MetaMask</span>
          </p>
        </div>
      </div>
    </div>
  )

  // Use React Portal to render modal at document.body level
  return createPortal(modalContent, document.body)
}
