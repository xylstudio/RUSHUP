import { redirect } from 'next/navigation'

export default function ProfilePageRedirect() {
  redirect('/dashboard/customer?tab=profile')
}