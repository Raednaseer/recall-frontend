'use client'

import { useAuth } from '@/lib/auth-context'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((option, i) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex-1 px-4 py-2 text-[13px] font-medium transition-colors',
            theme === option.value
              ? 'bg-accent text-accent-foreground'
              : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
            i > 0 && 'border-l border-border'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground mb-6">Settings</h1>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Account</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">Account email</p>
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-[13px] text-muted-foreground mb-1.5 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Appearance Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Appearance</h2>
        
        <div>
          <Label className="text-[13px] text-muted-foreground mb-2 block">
            Theme
          </Label>
          <ThemeSelector />
          <p className="text-xs text-muted-foreground mt-2">
            Choose your preferred color scheme
          </p>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Session Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Session</h2>
        
        <Button
          variant="ghost"
          onClick={logout}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Sign out
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Sign out of your current session
        </p>
      </section>

      <Separator className="my-6" />

      {/* Danger Zone */}
      <section>
        <h2 className="text-sm font-medium text-destructive mb-4">Danger zone</h2>
        
        <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
          <h3 className="text-sm font-medium text-foreground mb-1">
            Delete account
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            disabled
            className="border-destructive/30 text-destructive hover:bg-destructive/10 opacity-50 cursor-not-allowed"
          >
            Delete account
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Coming soon
          </p>
        </div>
      </section>
    </div>
  )
}
