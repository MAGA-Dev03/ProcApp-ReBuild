import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, updateOwnProfile } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/form'
import { useAuth } from './AuthContext'

const profileFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.password) return

    if (values.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 8 characters',
      })
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
  })

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfilePage() {
  const { currentUser, updateCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: currentUser?.name ?? '', password: '', confirmPassword: '' },
  })

  const updateMutation = useMutation({
    // `currentUser.id` comes from the authenticated session, not from any field on this form - see
    // the security note on `updateOwnProfile` for why that distinction matters (IDOR prevention).
    mutationFn: (values: ProfileFormValues) =>
      updateOwnProfile(currentUser!.id, {
        name: values.name,
        password: values.password || undefined,
      }),
    onSuccess: (updated, values) => {
      if (values.password) {
        // The server revokes every session on a password change, this one
        // included, so any further request would 401. Sign out cleanly instead.
        toast.success('Password changed. Please sign in with your new password.')
        logout()
        navigate('/login', { replace: true })
        return
      }
      updateCurrentUser(updated)
      reset({ name: updated.name, password: '', confirmPassword: '' })
      toast.success('Profile updated')
    },
  })

  if (!currentUser) return null

  async function handleFormSubmit(values: ProfileFormValues) {
    setError(null)
    try {
      await updateMutation.mutateAsync(values)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setFieldError(field as keyof ProfileFormValues, { message })
        }
      } else {
        setError('Could not save your profile. Please try again.')
      }
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium">{currentUser.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Roles</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {currentUser.roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          <TextField control={control} name="name" label="Name" required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="password"
              label="New Password"
              type="password"
              description="Leave blank to keep your current password."
            />
            <TextField
              control={control}
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
