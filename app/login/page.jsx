'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            <span className="text-muted-foreground mr-1">◆</span>
            Recall
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 bg-surface border-border"
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 bg-surface border-border"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No account yet?{' '}
          <Link href="/register" className="text-accent hover:text-accent/80">
            Register <span className="ml-0.5">→</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
