'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const AuthContext = createContext(null)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Auto-refresh token every 50 minutes
  useEffect(() => {
    if (!token) return

    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setToken(data.access_token)
        } else {
          handleLogout()
          toast.error('Session expired, please sign in again')
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
      }
    }, 50 * 60 * 1000) // 50 minutes

    return () => clearInterval(refreshInterval)
  }, [token])

  // Check for existing session on mount
  useEffect(() => {
    setIsLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser({ email })
    router.push('/chat')
    return data
  }

  const register = async (email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      if (response.status === 422 && error.detail) {
        throw { status: 422, detail: error.detail }
      }
      throw new Error(error.detail || 'Registration failed')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser({ email })
    router.push('/chat')
    return data
  }

  const handleLogout = useCallback(() => {
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const logout = () => {
    handleLogout()
  }

  // Fetch wrapper with auth
  const authFetch = useCallback(async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (response.status === 401) {
      handleLogout()
      toast.error('Session expired, please sign in again')
      throw new Error('Unauthorized')
    }

    return response
  }, [token, handleLogout])

  const value = {
    token,
    user,
    isLoading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    authFetch,
    API_URL,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
