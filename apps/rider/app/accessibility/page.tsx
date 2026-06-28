import PublicInfoPage from '@/components/public/PublicInfoPage'

export default function AccessibilityPage() {
  return (
    <PublicInfoPage
      kicker="Accessibility"
      title="Accessibility commitment"
      intro="Xylem Landscape is improving the public site and customer portal so that service discovery, account management, and customer reporting remain accessible across devices, screen sizes, and common assistive workflows."
      sections={[
        {
          title: 'Current focus',
          body: [
            'We prioritize responsive layouts, readable contrast, semantic actions, and straightforward navigation patterns across the public site and customer dashboard.',
            'Key workflows such as sign-in, service tracking, order review, reports, and profile management are being reviewed continuously for clarity and reduced friction.',
          ],
        },
        {
          title: 'Known gaps',
          body: [
            'Some legacy surfaces may still have content density, mixed-language copy, or interaction patterns that need additional polish for stronger accessibility consistency.',
            'We treat accessibility as a product quality requirement, not a one-time checklist, and continue updating navigation, labels, and interaction cues as the platform evolves.',
          ],
        },
        {
          title: 'Feedback',
          body: [
            'If any page or workflow is difficult to use, customers can contact the team directly so we can provide assistance and prioritize improvements.',
            'Accessibility feedback is especially valuable when it identifies barriers in booking, reporting, or account management workflows.',
          ],
        },
      ]}
    />
  )
}