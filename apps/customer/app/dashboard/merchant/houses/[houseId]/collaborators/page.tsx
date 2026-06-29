'use client';
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, Shield, Eye, Edit } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useToastContext } from '@/components/Toast'
import { useI18n } from "@/lib/I18nContext";

export default function HouseCollaboratorsPage() {
    const { locale } = useI18n();
  const params = useParams()
  const houseId = params?.houseId as string
  const router = useRouter()
  const { success, error: showError } = useToastContext()

  const [house, setHouse] = useState<any>(null)
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('editor')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (houseId) fetchData()
  }, [houseId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch house
      const { data: houseData, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .single()
      if (houseError) throw houseError
      setHouse(houseData)

      // 2. Fetch collaborators
      const { data: collabData, error: collabError } = await supabase
        .from('house_collaborators')
        .select(`
          id,
          role,
          created_at,
          user_id,
          profiles:user_id (id, email, display_name)
        `)
        .eq('house_id', houseId)
      if (collabError) throw collabError
      setCollaborators(collabData || [])

      // 3. Fetch all customers to add
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('role', 'customer')
      if (usersError) throw usersError
      
      // Filter out main owner and existing collaborators
      const existingUserIds = new Set(collabData?.map(c => c.user_id))
      if (houseData.user_id) existingUserIds.add(houseData.user_id)
      if (houseData.customer_id) existingUserIds.add(houseData.customer_id)
      
      const availableUsers = (usersData || []).filter(u => !existingUserIds.has(u.id))
      setUsers(availableUsers)

    } catch (err: any) {
      showError(err.message || 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      showError('กรุณาเลือกลูกค้า')
      return
    }

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from('house_collaborators')
        .insert({
          house_id: houseId,
          user_id: selectedUser,
          role: selectedRole
        })

      if (error) throw error
      
      success('เพิ่มผู้ดูแลเรียบร้อยแล้ว')
      setSelectedUser('')
      setSelectedRole('editor')
      await fetchData()
    } catch (err: any) {
      showError(err.message || 'ไม่สามารถเพิ่มผู้ดูแลได้')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!confirm('ยืนยันการลบผู้ดูแล?')) return
    try {
      const { error } = await supabase
        .from('house_collaborators')
        .delete()
        .eq('id', collabId)
        
      if (error) throw error
      success('ลบผู้ดูแลเรียบร้อยแล้ว')
      await fetchData()
    } catch (err: any) {
      showError(err.message || 'ไม่สามารถลบผู้ดูแลได้')
    }
  }

  const handleRoleChange = async (collabId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('house_collaborators')
        .update({ role: newRole })
        .eq('id', collabId)
        
      if (error) throw error
      success('อัปเดตสิทธิ์เรียบร้อยแล้ว')
      await fetchData()
    } catch (err: any) {
      showError(err.message || 'ไม่สามารถอัปเดตสิทธิ์ได้')
    }
  }

  if (loading) return <div className="p-10 text-center">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{locale === 'en' ? 'Manage housekeeper (Collaborators)' : locale === 'zh' ? '管理管家（合作者）' : 'จัดการผู้ดูแลบ้าน (Collaborators)'}</h1>
          <p className="text-gray-500">{locale === 'en' ? 'house:' : locale === 'zh' ? '房子：' : 'บ้าน: '}{house?.name} ({house?.house_code})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: List of collaborators */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={18}/> {locale === 'en' ? 'List of people with access rights' : locale === 'zh' ? '具有访问权限的人员列表' : ' รายชื่อผู้มีสิทธิ์เข้าถึง'}</h2>
            
            {/* Main Owner */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
              <div>
                <p className="font-bold text-sm">{locale === 'en' ? 'Main owner (Owner)' : locale === 'zh' ? '主要所有者（所有者）' : 'เจ้าของหลัก (Owner)'}</p>
                <p className="text-xs text-gray-500">{locale === 'en' ? 'It is the owner of the house that built this house. cannot be deleted' : locale === 'zh' ? '建造这所房子的是这所房子的主人。无法删除' : 'เป็นเจ้าของบ้านที่สร้างบ้านนี้ขึ้นมา ไม่สามารถลบได้'}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                {locale === 'en' ? 'owner' : locale === 'zh' ? '所有者' : '                 เจ้าของ               '}</span>
            </div>

            {/* Collaborators */}
            {collaborators.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {locale === 'en' ? 'There is no co-administrator yet.' : locale === 'zh' ? '目前还没有共同管理员。' : '                 ยังไม่มีผู้ดูแลร่วม               '}</div>
            ) : (
              <div className="space-y-3">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-sm">{c.profiles?.display_name || 'ไม่ระบุชื่อ'}</p>
                      <p className="text-xs text-gray-500">{c.profiles?.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={c.role} 
                        onChange={e => handleRoleChange(c.id, e.target.value)}
                        className="text-xs border rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="viewer">{locale === 'en' ? 'Can only be viewed (Viewer)' : locale === 'zh' ? '只能查看（查看者）' : 'ดูได้อย่างเดียว (Viewer)'}</option>
                        <option value="editor">{locale === 'en' ? 'Can edit/order work (Editor)' : locale === 'zh' ? '可以编辑/订购作品（编辑）' : 'แก้ไข/สั่งงานได้ (Editor)'}</option>
                      </select>
                      <button 
                        onClick={() => handleRemoveCollaborator(c.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={locale === 'en' ? 'Delete permissions' : locale === 'zh' ? '删除权限' : 'ลบสิทธิ์'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add form */}
        <div className="space-y-4">
          <form onSubmit={handleAddCollaborator} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus size={18}/> {locale === 'en' ? 'Add a moderator' : locale === 'zh' ? '添加主持人' : ' เพิ่มผู้ดูแล'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{locale === 'en' ? 'Choose a customer' : locale === 'zh' ? '选择客户' : 'เลือกลูกค้า'}</label>
                <select
                  required
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="">{locale === 'en' ? '-- Select customer --' : locale === 'zh' ? '-- 选择客户 --' : '-- เลือกลูกค้า --'}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.display_name || u.email} {u.display_name ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{locale === 'en' ? 'Permission level' : locale === 'zh' ? '权限级别' : 'ระดับสิทธิ์'}</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${selectedRole === 'viewer' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="role" value="viewer" checked={selectedRole === 'viewer'} onChange={() => setSelectedRole('viewer')} className="mt-1 accent-emerald-600" />
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1"><Eye size={14}/> Viewer</div>
                      <div className="text-xs text-gray-500">{locale === 'en' ? 'View home information and report repairs. But cannot add/edit' : locale === 'zh' ? '查看房屋信息并报告维修情况。但无法添加/编辑' : 'ดูข้อมูลบ้านและการแจ้งซ่อมได้ แต่ไม่สามารถเพิ่ม/แก้ไขได้'}</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${selectedRole === 'editor' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="role" value="editor" checked={selectedRole === 'editor'} onChange={() => setSelectedRole('editor')} className="mt-1 accent-emerald-600" />
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1"><Edit size={14}/> Editor</div>
                      <div className="text-xs text-gray-500">{locale === 'en' ? 'Manage home information and order repair work like the owner.' : locale === 'zh' ? '像业主一样管理家庭信息并订购维修工作。' : 'จัดการข้อมูลบ้านและสั่งงานซ่อมได้เสมือนเจ้าของ'}</div>
                    </div>
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isAdding || !selectedUser}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มสิทธิ์เข้าถึง'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
