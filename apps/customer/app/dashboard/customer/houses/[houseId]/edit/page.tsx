import { redirect } from 'next/navigation'

export default function LegacyEditHouseRedirect({ params }: { params: { houseId: string } }) {
  redirect(`/dashboard/customer/houses/edit/${encodeURIComponent(params.houseId)}`)
}
