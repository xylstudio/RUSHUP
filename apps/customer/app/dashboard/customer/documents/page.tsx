import { redirect } from 'next/navigation'

export default function DocumentsPageRedirect() {
  redirect('/dashboard/customer?tab=documents')
}
