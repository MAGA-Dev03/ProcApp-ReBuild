import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ApiError } from '@/api/client'
import { assetUrl } from '@/lib/utils'
import { useAuth } from './AuthContext'
import { loginSchema, type LoginFormValues } from './validation'

export function LoginPage() {
  const { login, isAuthenticating, currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)

  const redirectTo = (location.state as { from?: Location } | null)?.from?.pathname ?? '/profile'

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null)
    try {
      await login(values.email, values.password, values.rememberMe)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setAuthError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  // Already signed in (persisted session, or navigated here by hand) — skip the form.
  if (currentUser) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <img src={assetUrl('/logo.png')} alt="MAGA Engineering" className="h-16 w-auto" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to ProcApp</CardTitle>
          <CardDescription>Invoice Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {authError && (
              <Alert variant="destructive">
                <AlertTitle>Sign in failed</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="rememberMe"
                render={({ field }) => (
                  <Checkbox
                    id="rememberMe"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Label htmlFor="rememberMe" className="font-normal">
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isAuthenticating}>
              {isAuthenticating ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <footer className="text-center text-xs text-muted-foreground">
        Copyright © MAGA IT 2026. All rights reserved.
      </footer>
    </div>
  )
}
