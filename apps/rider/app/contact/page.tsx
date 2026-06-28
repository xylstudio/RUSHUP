import PublicInfoPage from '@/components/public/PublicInfoPage'

export default function ContactPage() {
  return (
    <PublicInfoPage
      kicker="Contact"
      title="Contact Xylem Landscape"
      intro="Use this page as the contact surface for consultations, recurring care planning, workshop coordination, customer account support, or enterprise landscape discussions."
      sections={[
        {
          title: 'Consultations and new business',
          body: [
            'The best path for new customers is to explain property type, location, service goals, timeline, and whether the requirement is residential, estate, hospitality, or commercial.',
            'For multi-property or recurring programs, include the number of sites, expected service cadence, and any reporting or approval workflow requirements.',
          ],
        },
        {
          title: 'Support channels',
          body: [
            'Existing customers can use the customer portal for orders, property records, reports, and service visibility, then escalate to direct contact when additional coordination is needed.',
            'If LINE notifications are enabled, service completion and support-related updates may also flow through LINE depending on account status.',
          ],
        },
        {
          title: 'Recommended next step',
          body: [
            'If you already have an account, sign in to the customer portal to review properties, active orders, reports, and profile settings.',
            'If you are exploring the brand for the first time, review the service areas and public service overview first, then continue with consultation or account creation.',
          ],
        },
      ]}
    />
  )
}