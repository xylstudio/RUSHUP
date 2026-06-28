import AdminServiceFormScreen from '@/components/admin/AdminServiceFormScreen'

export default function EditService({ params }: { params: { serviceId: string } }) {
  return <AdminServiceFormScreen mode="edit" serviceId={params.serviceId} />
}
