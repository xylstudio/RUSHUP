const fs = require('fs');

const path = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSMenuManager.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

export default function POSMenuManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, shopSettings
}: POSMenuManagerProps) {
  const { locale } = useI18n();
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [allModifierGroups, setAllModifierGroups] = useState<any[]>([])
  const [itemModifierLinks, setItemModifierLinks] = useState<string[]>([])

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // --- Bulk Edit / Table View ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['image_url', 'name', 'category_id', 'sale_price', 'cost_price', 'is_recommended'])
  const [showColumnSelector, setShowColumnSelector] = useState(false)

  const columns = [
    { id: 'image_url', label: 'รูปภาพ' },
    { id: 'name', label: 'ชื่อเมนู' },
    { id: 'category_id', label: 'หมวดหมู่' },
    { id: 'sale_price', label: 'ราคาขาย' },
    { id: 'cost_price', label: 'ราคาต้นทุน' },
    { id: 'is_recommended', label: 'เมนูแนะนำ' },
    { id: 'is_popular', label: 'ยอดนิยม' },
    { id: 'is_online_available', label: 'สั่งผ่าน QR' },
    { id: 'is_delivery_available', label: 'Delivery' },
    { id: 'status', label: 'สถานะ' },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-100 mr-2">
                   <button `;

content = content.replace(
  `  onSetView: (view: any) => void
                       onClick={() => setViewMode('grid')} 
                       className={\`w-10 h-10 flex items-center justify-center transition-all \${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}\`}
                   >
                       <LayoutGrid size={18} />
                   </button>`,
  replacement + `\n                       onClick={() => setViewMode('grid')} \n                       className={\`w-10 h-10 flex items-center justify-center transition-all \${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}\`}\n                   >\n                       <LayoutGrid size={18} />\n                   </button>`
);

fs.writeFileSync(path, content);
console.log('Fixed POSMenuManager!');
