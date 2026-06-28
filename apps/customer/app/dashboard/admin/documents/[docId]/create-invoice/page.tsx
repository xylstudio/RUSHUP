'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateInvoiceFromDocumentRedirectPage({ params }: { params: { docId: string } }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${params.docId}`)
  }, [params.docId, router])

  return null
}
