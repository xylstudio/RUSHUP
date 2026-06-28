import { redirect } from 'next/navigation'

export default function Step3Redirect() {
  redirect('/dashboard/customer?tab=orders')
}
