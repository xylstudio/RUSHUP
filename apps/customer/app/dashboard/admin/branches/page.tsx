'use client';
import { useState, useEffect, FormEvent } from 'react';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  BranchData
} from '../../../../lib/supabaseClient';
import { FiPlus, FiEdit, FiTrash2, FiMapPin, FiCopy } from 'react-icons/fi';
import AddressMapInput from '../../../../components/AddressMapInput';
import { cloneBranchData, type CloneOptions } from '../../../../lib/branchCloneHelper';
import { useI18n } from "@/lib/I18nContext";

type Branch = BranchData & { id: string };

export default function BranchesPage() {
    const { locale } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [formData, setFormData] = useState<Partial<Branch>>({
    branch_code: '',
    branch_name: '',
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    service_zip_codes: [],
    branch_type: 'both',
    latitude: 13.7563,
    longitude: 100.5018,
  });
  const [zipCodeInput, setZipCodeInput] = useState('');

  // Clone Settings
  const [cloneSourceId, setCloneSourceId] = useState<string>('');
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({
    categories: true,
    itemsAndModifiers: true,
    recipes: true,
    inventory: true,
    shareMembers: true
  });
  const [isCloning, setIsCloning] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    const { data, error } = await getBranches();
    if (error) {
      setError(error.message);
    } else if (data) {
      setBranches(data as Branch[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openModalForNew = () => {
    setEditingBranch(null);
    setFormData({
      branch_code: '',
      branch_name: '',
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      service_zip_codes: [],
      branch_type: 'both',
      latitude: 13.7563,
      longitude: 100.5018,
    });
    setZipCodeInput('');
    setCloneSourceId('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_code: branch.branch_code || '',
      branch_name: branch.branch_name || '',
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      service_zip_codes: branch.service_zip_codes || [],
      branch_type: branch.branch_type || 'both',
      latitude: Number(branch.latitude) || 13.7563,
      longitude: Number(branch.longitude) || 100.5018,
    });
    setZipCodeInput(branch.service_zip_codes.join(', '));
    setIsModalOpen(true);
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setZipCodeInput(input);
    const zipArray = input.split(',').map(zip => zip.trim()).filter(zip => zip.length > 0);
    setFormData({ ...formData, service_zip_codes: zipArray });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let result;
    if (editingBranch) {
      // Update
      result = await updateBranch(editingBranch.id, formData);
    } else {
      // Create
      result = await createBranch(formData);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      // If creating new branch and clone source is selected
      if (!editingBranch && cloneSourceId && result.data) {
        setIsCloning(true);
        const cloneResult = await cloneBranchData(cloneSourceId, result.data.id, cloneOptions);
        setIsCloning(false);
        if (!cloneResult.success) {
          setError('สาขาถูกสร้างแล้วแต่เกิดข้อผิดพลาดในการคัดลอกข้อมูล: ' + cloneResult.error);
          return;
        }
      }
      setIsModalOpen(false);
      await fetchBranches(); // Refresh list
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสาขา "${branch.branch_name}"?`)) {
        const { error } = await deleteBranch(branch.id);
        if (error) {
            setError(error.message);
        } else {
            await fetchBranches(); // Refresh list
        }
    }
  }

  if (loading) return <p>Loading branches...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{locale === 'en' ? 'จัดการสาขา' : locale === 'zh' ? 'จัดการสาขา' : 'จัดการสาขา'}</h1>
        <button
          onClick={openModalForNew}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          {locale === 'en' ? '           เพิ่มสาขาใหม่         ' : locale === 'zh' ? '           เพิ่มสาขาใหม่         ' : '           เพิ่มสาขาใหม่         '}</button>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>}

      {/* Table to display branches */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch Name</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service ZIPs</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{branch.branch_code}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{branch.branch_name}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    branch.branch_type === 'garden' ? 'bg-green-100 text-green-800' :
                    branch.branch_type === 'cafe' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {branch.branch_type === 'garden' ? 'สวน' : branch.branch_type === 'cafe' ? 'คาเฟ่' : 'ทั้งสองอย่าง'}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="flex flex-wrap gap-1">
                    {branch.service_zip_codes.map(zip => <span key={zip} className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">{zip}</span>)}
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button onClick={() => openModalForEdit(branch)} className="text-blue-600 hover:text-blue-900 mr-3"><FiEdit /></button>
                  <button onClick={() => handleDelete(branch)} className="text-red-600 hover:text-red-900"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit Branch */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-8 rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold mb-6">{editingBranch ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="branch_code" className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'รหัสสาขา (2 หลัก)' : locale === 'zh' ? 'รหัสสาขา (2 หลัก)' : 'รหัสสาขา (2 หลัก)'}</label>
                    <input type="text" id="branch_code" value={formData.branch_code} onChange={e => setFormData({...formData, branch_code: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required maxLength={2} />
                  </div>
                  <div>
                    <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'ชื่อสาขา' : locale === 'zh' ? 'ชื่อสาขา' : 'ชื่อสาขา'}</label>
                    <input type="text" id="branch_name" value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                  </div>
                </div>
                <div>
                    <label htmlFor="branch_type" className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'ประเภทสาขา' : locale === 'zh' ? 'ประเภทสาขา' : 'ประเภทสาขา'}</label>
                    <select
                      id="branch_type"
                      value={formData.branch_type}
                      onChange={e => setFormData({...formData, branch_type: e.target.value as 'garden' | 'cafe' | 'both'})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                    >
                      <option value="both">{locale === 'en' ? 'ทั้งสองอย่าง (Both)' : locale === 'zh' ? 'ทั้งสองอย่าง (Both)' : 'ทั้งสองอย่าง (Both)'}</option>
                      <option value="garden">{locale === 'en' ? 'สวน (Garden)' : locale === 'zh' ? 'สวน (Garden)' : 'สวน (Garden)'}</option>
                      <option value="cafe">{locale === 'en' ? 'คาเฟ่ (Cafe)' : locale === 'zh' ? 'คาเฟ่ (Cafe)' : 'คาเฟ่ (Cafe)'}</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="service_zip_codes" className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'รหัสไปรษณีย์ที่ให้บริการ (คั่นด้วยลูกน้ำ ,)' : locale === 'zh' ? 'รหัสไปรษณีย์ที่ให้บริการ (คั่นด้วยลูกน้ำ ,)' : 'รหัสไปรษณีย์ที่ให้บริการ (คั่นด้วยลูกน้ำ ,)'}</label>
                    <input type="text" id="service_zip_codes" value={zipCodeInput} onChange={handleZipCodeChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required placeholder={locale === 'en' ? 'เช่น 10110, 10210, 50000' : locale === 'zh' ? 'เช่น 10110, 10210, 50000' : 'เช่น 10110, 10210, 50000'} />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'ที่อยู่สาขา' : locale === 'zh' ? 'ที่อยู่สาขา' : 'ที่อยู่สาขา'}</label>
                    <textarea id="address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-none shadow-sm mb-2" rows={2}></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="latitude" className="block text-[10px] font-black uppercase text-gray-400">{locale === 'en' ? 'พิกัด Latitude' : locale === 'zh' ? 'พิกัด Latitude' : 'พิกัด Latitude'}</label>
                    <input 
                      type="number" 
                      step="any"
                      id="latitude" 
                      value={formData.latitude} 
                      onChange={e => setFormData({...formData, latitude: Number(e.target.value)})} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-none shadow-sm text-xs" 
                    />
                  </div>
                  <div>
                    <label htmlFor="longitude" className="block text-[10px] font-black uppercase text-gray-400">{locale === 'en' ? 'พิกัด Longitude' : locale === 'zh' ? 'พิกัด Longitude' : 'พิกัด Longitude'}</label>
                    <input 
                      type="number" 
                      step="any"
                      id="longitude" 
                      value={formData.longitude} 
                      onChange={e => setFormData({...formData, longitude: Number(e.target.value)})} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-none shadow-sm text-xs" 
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiMapPin className="text-blue-600" />
                    {locale === 'en' ? '                     ระบุตำแหน่งบนแผนที่                   ' : locale === 'zh' ? '                     ระบุตำแหน่งบนแผนที่                   ' : '                     ระบุตำแหน่งบนแผนที่                   '}</label>
                  <AddressMapInput 
                    initialLocation={{ 
                      lat: Number(formData.latitude) || 13.7563, 
                      lng: Number(formData.longitude) || 100.5018 
                    }}
                    initialAddress={formData.address || ''}
                    onLocationSelect={(lat, lng, addr) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        address: addr || prev.address
                      }))
                    }}
                  />
                </div>
              
              {!editingBranch && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold mb-4 flex items-center text-gray-700">
                    <FiCopy className="mr-2" /> {locale === 'en' ? ' คัดลอกข้อมูลจากสาขาเดิม                   ' : locale === 'zh' ? ' คัดลอกข้อมูลจากสาขาเดิม                   ' : ' คัดลอกข้อมูลจากสาขาเดิม                   '}</h3>
                  <div className="mb-4">
                    <select
                      value={cloneSourceId}
                      onChange={(e) => setCloneSourceId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'en' ? '-- ไม่คัดลอก (สร้างสาขาเปล่า) --' : locale === 'zh' ? '-- ไม่คัดลอก (สร้างสาขาเปล่า) --' : '-- ไม่คัดลอก (สร้างสาขาเปล่า) --'}</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                      ))}
                    </select>
                  </div>

                  {cloneSourceId && (
                    <div className="space-y-2 bg-gray-50 p-4 rounded-md border text-sm">
                      <p className="font-semibold text-gray-600 mb-2">{locale === 'en' ? 'เลือกข้อมูลที่ต้องการคัดลอก:' : locale === 'zh' ? 'เลือกข้อมูลที่ต้องการคัดลอก:' : 'เลือกข้อมูลที่ต้องการคัดลอก:'}</p>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={cloneOptions.categories} onChange={e => setCloneOptions({...cloneOptions, categories: e.target.checked})} className="rounded text-blue-600" />
                        <span>{locale === 'en' ? 'หมวดหมู่เมนู (Categories)' : locale === 'zh' ? 'หมวดหมู่เมนู (Categories)' : 'หมวดหมู่เมนู (Categories)'}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={cloneOptions.itemsAndModifiers} onChange={e => setCloneOptions({...cloneOptions, itemsAndModifiers: e.target.checked})} className="rounded text-blue-600" />
                        <span>{locale === 'en' ? 'เมนูอาหาร และ ตัวเลือกเสริม (Items & Modifiers)' : locale === 'zh' ? 'เมนูอาหาร และ ตัวเลือกเสริม (Items & Modifiers)' : 'เมนูอาหาร และ ตัวเลือกเสริม (Items & Modifiers)'}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={cloneOptions.recipes} onChange={e => setCloneOptions({...cloneOptions, recipes: e.target.checked})} className="rounded text-blue-600" />
                        <span>{locale === 'en' ? 'ข้อมูลสูตรอาหาร (Recipes)' : locale === 'zh' ? 'ข้อมูลสูตรอาหาร (Recipes)' : 'ข้อมูลสูตรอาหาร (Recipes)'}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={cloneOptions.inventory} onChange={e => setCloneOptions({...cloneOptions, inventory: e.target.checked})} className="rounded text-blue-600" />
                        <span>{locale === 'en' ? 'คลังวัตถุดิบ (Inventory - ดึงเฉพาะรายการ สต๊อกเริ่มที่ 0)' : locale === 'zh' ? 'คลังวัตถุดิบ (Inventory - ดึงเฉพาะรายการ สต๊อกเริ่มที่ 0)' : 'คลังวัตถุดิบ (Inventory - ดึงเฉพาะรายการ สต๊อกเริ่มที่ 0)'}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={cloneOptions.shareMembers} onChange={e => setCloneOptions({...cloneOptions, shareMembers: e.target.checked})} className="rounded text-blue-600" />
                        <span>{locale === 'en' ? 'ใช้ฐานข้อมูลสมาชิกร่วมกัน (ลูกค้าร้านเดียวกัน สะสมแต้มร่วมกันได้)' : locale === 'zh' ? 'ใช้ฐานข้อมูลสมาชิกร่วมกัน (ลูกค้าร้านเดียวกัน สะสมแต้มร่วมกันได้)' : 'ใช้ฐานข้อมูลสมาชิกร่วมกัน (ลูกค้าร้านเดียวกัน สะสมแต้มร่วมกันได้)'}</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">{locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}</button>
                    <button
                  type="submit"
                  disabled={isCloning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCloning ? 'กำลังคัดลอกข้อมูล...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}