import { redirect } from 'next/navigation'

export default function Step1Redirect() {
  redirect('/dashboard/customer?tab=orders')
}
