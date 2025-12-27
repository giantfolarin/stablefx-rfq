'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers'
import { SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI } from '@/lib/contracts'

interface WalletContextType {
  account: string | null
  isConnecting: boolean
  error: string | null
  chainId: number | null
  isCorrectNetwork: boolean
  provider: BrowserProvider | null
  swapContract: Contract | null
  connectWallet: (selectedProvider?: any) => Promise<void>
  disconnectWallet: () => void
  switchToArcTestnet: () => Promise<void>  // Manual network switch
}

// Arc Testnet Chain ID
const ARC_TESTNET_CHAIN_ID = 5042002 // Actual Arc Testnet Chain ID
const ARC_TESTNET_CHAIN_ID_HEX = '0x4cef52' // 5042002 in hex (lowercase to match RPC response)

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [swapContract, setSwapContract] = useState<Contract | null>(null)

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          setAccount(accounts[0])
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  async function checkConnection() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()

        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          const network = await provider.getNetwork()
          const currentChainId = Number(network.chainId)

          setAccount(address)
          setChainId(currentChainId)
          setProvider(provider)

          // Check if on correct network
          const correctNetwork = currentChainId === ARC_TESTNET_CHAIN_ID
          setIsCorrectNetwork(correctNetwork)

          if (correctNetwork) {
            // Initialize contract only if on correct network
            const contract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, signer)
            setSwapContract(contract)
          } else {
            setSwapContract(null)
            console.warn(`Wrong network. Please switch to Arc Testnet (Chain ID: ${ARC_TESTNET_CHAIN_ID})`)
            console.log('Attempting to switch to Arc Testnet...')

            // Automatically prompt user to switch to Arc Testnet
            try {
              await switchToArcTestnet()
              // Network switch initiated - page will reload via chainChanged event
            } catch (switchErr: any) {
              console.error('Network switch failed:', switchErr)
              setError(`Wrong network: ${switchErr.message}`)
              // Silent error - MetaMask popup will show the network switch request
            }
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err)
      }
    }
  }

  async function connectWallet(selectedProvider?: any) {
    // Use selected provider if provided, otherwise fall back to window.ethereum
    const providerToUse = selectedProvider || window.ethereum

    if (typeof window === 'undefined' || !providerToUse) {
      setError('No Ethereum provider found. Please install a wallet.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // CRITICAL: Use the specific provider selected by the user
      const provider = new BrowserProvider(providerToUse)

      // Request account access from THIS specific provider
      await provider.send('eth_requestAccounts', [])

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const currentChainId = Number(network.chainId)

      setAccount(address)
      setChainId(currentChainId)
      setProvider(provider)

      // Check if on correct network
      const correctNetwork = currentChainId === ARC_TESTNET_CHAIN_ID
      setIsCorrectNetwork(correctNetwork)

      if (correctNetwork) {
        // Initialize contract with signer
        const contract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, signer)
        setSwapContract(contract)
        console.log('Wallet connected:', address)
        console.log('Network: Arc Testnet (Chain ID:', network.chainId, ')')
      } else {
        setSwapContract(null)
        console.warn('Wrong network detected. Chain ID:', currentChainId, `(Expected: ${ARC_TESTNET_CHAIN_ID})`)
        console.log('Attempting to switch to Arc Testnet...')

        // Automatically prompt user to switch to Arc Testnet
        try {
          await switchToArcTestnet()
          // Network switch initiated - page will reload via chainChanged event
        } catch (switchErr: any) {
          console.error('Network switch failed:', switchErr)
          setError(`Wrong network: ${switchErr.message}`)
          // Silent error - MetaMask popup will show the network switch request
          // Keep wallet connected but show error
        }
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err)
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  async function switchToArcTestnet() {
    console.log('🔄 switchToArcTestnet() called')
    console.log('Chain ID to switch to:', ARC_TESTNET_CHAIN_ID_HEX, `(${ARC_TESTNET_CHAIN_ID})`)

    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed')
    }

    console.log('Requesting MetaMask to switch to Chain ID:', ARC_TESTNET_CHAIN_ID_HEX)

    try {
      // Try to switch to Arc Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }],
      })
      console.log('✅ Successfully switched to Arc Testnet')
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        console.log('Arc Testnet not found in wallet, adding it...')
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ARC_TESTNET_CHAIN_ID_HEX,
              chainName: 'Arc Testnet',
              nativeCurrency: {
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 18,  // Native gas token uses 18 decimals (like ETH)
              },
              rpcUrls: [
                'https://rpc.testnet.arc.network',
                'https://rpc.blockdaemon.testnet.arc.network',
                'https://rpc.drpc.testnet.arc.network',
                'https://rpc.quicknode.testnet.arc.network'
              ],
              blockExplorerUrls: ['https://testnet.arcscan.app'],
            },
          ],
        })
        console.log('✅ Successfully added Arc Testnet to wallet')
      } else if (switchError.code === 4001) {
        // User rejected the request
        throw new Error('You must switch to Arc Testnet to use this app')
      } else {
        // Other error
        throw new Error(`Failed to switch network: ${switchError.message}`)
      }
    }
  }

  function disconnectWallet() {
    setAccount(null)
    setChainId(null)
    setIsCorrectNetwork(false)
    setProvider(null)
    setSwapContract(null)
    setError(null)
  }

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        error,
        chainId,
        isCorrectNetwork,
        provider,
        swapContract,
        connectWallet,
        disconnectWallet,
        switchToArcTestnet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
