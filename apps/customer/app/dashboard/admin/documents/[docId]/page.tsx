'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDocumentPage({ params }: { params: { docId: string } }) {
	const router = useRouter()

	useEffect(() => {
		router.replace(`/dashboard/admin/documents/create-manual?edit=${params.docId}`)
	}, [params.docId, router])

	return null
}
