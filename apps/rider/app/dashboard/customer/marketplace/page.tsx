import { redirect } from 'next/navigation'

export default function MarketplacePageRedirect() {
  redirect('/dashboard/customer?tab=marketplace')
}
