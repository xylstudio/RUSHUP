import { User, Bell, Lock, Globe, Eye, Shield, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function SettingsView() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (val: boolean) => void }) => (
    <button 
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-orange-500' : 'bg-slate-300'
      }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
        value ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-8 text-white">
        <h1 className="text-2xl font-bold">การตั้งค่า</h1>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Account */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">บัญชี</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-slate-50">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <User size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">ข้อมูลส่วนตัว</div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
            <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-slate-50">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Lock size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">เปลี่ยนรหัสผ่าน</div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Privacy */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">ความเป็นส่วนตัว</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Eye size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">บัญชีส่วนตัว</div>
              </div>
              <Toggle value={privateAccount} onChange={setPrivateAccount} />
            </div>
            <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-slate-50">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">ข้อมูลส่วนบุคคล</div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">การแจ้งเตือน</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Bell size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Push Notifications</div>
              </div>
              <Toggle value={pushNotifications} onChange={setPushNotifications} />
            </div>
          </div>
        </div>

        {/* General */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">ทั่วไป</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-slate-50">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Globe size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">ภาษา</div>
                <div className="text-xs text-slate-500">ไทย</div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3 px-2">พื้นที่อันตราย</h2>
          <button className="w-full px-4 py-3 border-2 border-red-200 text-red-600 font-semibold rounded-xl active:bg-red-50">
            ลบบัญชี
          </button>
        </div>

        {/* Version */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-slate-400">Tripnect v2.0.1</p>
        </div>
      </div>
    </div>
  );
}
