import PublicInfoPage from '@/components/public/PublicInfoPage'

export default function ServiceAreasPage() {
  return (
    <PublicInfoPage
      kicker="Service Areas"
      title="Service areas and engagement model"
      intro="Service area communication is part of trust. Customers should know whether the company supports residential jobs, estate programs, workshops, or recurring operations in their region before entering a portal flow."
      sections={[
        {
          title: 'Residential and private estates',
          body: [
            'The platform is suited to customers with one or multiple homes who need landscape work, plant care, scheduled maintenance, property history, and post-service reporting.',
            'Multi-property workflows are especially important where the same customer manages multiple addresses or wants service continuity across homes.',
          ],
        },
        {
          title: 'Hospitality, retail, and commercial environments',
          body: [
            'Commercial service delivery typically requires stronger approval paths, scheduling discipline, reporting visibility, and recurring care structures.',
            'The system direction supports that model by centering orders, reports, notifications, and documents as part of the customer-facing experience.',
          ],
        },
        {
          title: 'Availability and planning',
          body: [
            'Actual coverage depends on location, workforce capacity, service type, property readiness, and seasonal conditions. Workshops may follow a different availability model from on-site landscape services.',
            'Customers planning recurring programs or larger-scale engagement should contact the team early so implementation and reporting needs can be scoped correctly.',
          ],
        },
      ]}
    />
  )
}