'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()

  const passwordRequirements = useMemo(() => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains number', met: /[0-9]/.test(password) },
    ]
  }, [password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    const unmetRequirements = passwordRequirements.filter(r => !r.met)
    if (unmetRequirements.length > 0) {
      setFieldErrors({ password: 'Password does not meet requirements' })
      return
    }

    setIsLoading(true)

    try {
      await register(email, password)
    } catch (err) {
      if (err.status === 422 && Array.isArray(err.detail)) {
        const errors = {}
        err.detail.forEach(e => {
          const field = e.loc[e.loc.length - 1]
          errors[field] = e.msg
        })
        setFieldErrors(errors)
      } else if (err.message?.includes('409') || err.message?.includes('exists')) {
        setError('An account with this email already exists')
      } else {
        setError(err.message || 'Registration failed')
      }
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
            Create your account
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
            {fieldErrors.email && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
            )}
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
            {fieldErrors.password && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
            )}
            
            {password && (
              <ul className="mt-2 space-y-1">
                {passwordRequirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                      {req.met ? '✓' : '✗'}
                    </span>
                    <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-10 bg-surface border-border"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent/80">
            Sign in <span className="ml-0.5">→</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
