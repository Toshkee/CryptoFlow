import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiPost, apiUpload } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [uploading, setUploading] = useState(false)

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await apiPost('/accounts/profile/update/', { username, email })
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Update failed', { description: (err as Error).message })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async () => {
    if (newPw.length < 8) return toast.error('New password must be at least 8 characters')
    setSavingPw(true)
    try {
      await apiPost('/accounts/change-password/', { old_password: oldPw, new_password: newPw })
      toast.success('Password changed')
      setOldPw('')
      setNewPw('')
    } catch (err) {
      toast.error('Change failed', { description: (err as Error).message })
    } finally {
      setSavingPw(false)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      await apiUpload<{ user: User }>('/accounts/upload-picture/', fd)
      await refreshUser()
      toast.success('Photo updated')
    } catch (err) {
      toast.error('Upload failed', { description: (err as Error).message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Profile</h1>

      <div className="space-y-6">
        {/* avatar */}
        <Card>
          <CardContent className="flex items-center gap-5 pt-5">
            <div className="relative">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="" className="size-20 rounded-full object-cover" />
              ) : (
                <span className="grid size-20 place-items-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
                  {user?.username?.slice(0, 1).toUpperCase()}
                </span>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-border bg-surface-3 text-muted hover:text-text"
                aria-label="Change photo"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            </div>
            <div>
              <div className="text-lg font-semibold">{user?.username}</div>
              <div className="text-sm text-muted">{user?.email}</div>
            </div>
          </CardContent>
        </Card>

        {/* account */}
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u">Username</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e">Email</Label>
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </CardContent>
        </Card>

        {/* password */}
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="op">Current password</Label>
              <Input id="op" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={changePassword} disabled={savingPw}>
              {savingPw && <Loader2 className="animate-spin" />} Update password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
