import { redirect } from 'next/navigation'

export default function MenuShortcutPage() {
  // Simple, high-speed server-side redirect
  // This ensures that clicking a link to /menu in LINE ALWAYS lands on the correct page.
  redirect('/liff/menu')
}
