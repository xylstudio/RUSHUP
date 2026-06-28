// seed_plants.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const plants = [
  { item_name: 'พุดกุหลาบ', english_name: 'Crepe Jasmine', scientific_name: 'Tabernaemontana divaricata', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'หมากเขียว/หมากเขียวกอ', english_name: 'Macarthur Palm', scientific_name: 'Ptychosperma macarthurii', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'หมากสง', english_name: 'Areca Palm / Betel Nut Palm', scientific_name: 'Areca catechu', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'แคนา', english_name: 'Dolichandrone serrulata', scientific_name: 'Dolichandrone serrulata', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'ต้นพุดภูเก็ต', english_name: 'Golden Gardenia', scientific_name: 'Gardenia', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'จิกน้ำ', english_name: 'Freshwater Mangrove', scientific_name: 'Barringtonia acutangula', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'พุดสามสี', english_name: 'Yesterday-Today-and-Tomorrow', scientific_name: 'Brunfelsia uniflora', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'ซุ้มแสง', english_name: 'Xanthostemon', scientific_name: 'Xanthostemon chrysanthus', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'ลีลาวดี', english_name: 'Frangipani / Plumeria', scientific_name: 'Plumeria spp.', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'หว้าแม่น้ำโขง', english_name: 'Syzygium', scientific_name: 'Syzygium', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'แก้วเจ้าจอม', english_name: 'Lignum Vitae', scientific_name: 'Guaiacum officinale', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'เสี้ยวดอกขาว', english_name: 'Orchid Tree', scientific_name: 'Bauhinia variegata L. var. candida', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'เสม็ดแดง', english_name: 'Syzygium', scientific_name: 'Syzygium gratum (Wight) S.N. Mitra', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'ชงโคฮอลแลนด์', english_name: 'Purple Bauhinia', scientific_name: 'Bauhinia x blakeana Dunn', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'สัก', english_name: 'Teak', scientific_name: 'Tectona grandis L.f.', main_category: 'softscape', subcategory: 'tree', unit: 'ต้น' },
  { item_name: 'หนวดปลาหมึกแคระ', english_name: 'Dwarf Umbrella Tree', scientific_name: 'Schefflera arboricola', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เฟินฮาวาย', english_name: 'Hawaii Fern', scientific_name: 'Phymatosorus scolopendria', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เฟินใบมะขาม', english_name: 'Fishbone Fern', scientific_name: 'Nephrolepis cordifolia (L.) Presl', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'พุดศุภโชค', english_name: 'Gardenia', scientific_name: 'Gardenia jasminoides', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'พุดซ้อน', english_name: 'Cape Jasmine', scientific_name: 'Gardenia augusta', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ยี่โถแคระดอกขาว', english_name: 'Dwarf Oleander', scientific_name: 'Nerium oleander', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ยี่โถแคระดอกชมพู', english_name: 'Dwarf Oleander', scientific_name: 'Nerium oleander', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'พลับพลึง', english_name: 'Giant Lily', scientific_name: 'Crinum asiaticum', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'จันทน์กะพ้อ', english_name: 'Chan Kaphor', scientific_name: 'Vatica odorata (Griffith.) Symington', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ต้อยติ่งเทศดอกขาว', english_name: 'Waterkanon', scientific_name: 'Ruellia tuberosa L.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เตยหอม', english_name: 'Pandan', scientific_name: 'Pandanus amaryllifolius Roxb.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ซานาดู', english_name: 'Xanadu', scientific_name: "Philodendron 'Xanadu'", main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ฟิโลใบมะละกอ', english_name: 'Philodendron Selloum', scientific_name: 'Philodendron bipinnatifidum', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ฟิโลหูช้าง', english_name: 'Elephant Ear Philodendron', scientific_name: 'Philodendron giganteum Schott', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'หลิวเลื้อย', english_name: 'Weeping Lantana', scientific_name: 'Lantana montevidensis (Spreng.) Briq.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'บุษบาฮาวาย', english_name: 'Ganges Primrose', scientific_name: 'Asystasia gangetica (L.) T. Anderson', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ชะพลู', english_name: 'Wildbetal Leafbush', scientific_name: 'Piper sarmentosum Roxb.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เข็มชมพูนุช', english_name: 'Pink Ixora', scientific_name: 'Ixora sp.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เทียนหยด', english_name: 'Golden Dewdrop', scientific_name: 'Duranta erecta L.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เสือดาว', english_name: 'Gold-dust Dracaena', scientific_name: 'Dracaena surculosa Lindl.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ขาไก่เขียว', english_name: 'Justicia', scientific_name: 'Justicia gendarussa Burm.f.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'กะพ้อ', english_name: 'Mangrove Fan Palm', scientific_name: 'Licuala spinosa Wurmb', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'เข็มม่วง', english_name: 'Blue Sage', scientific_name: 'Pseuderanthemum laxiflorum (A. Gray) Hubbard', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'แก้วแคระ', english_name: 'Andaman Satinwood', scientific_name: "Murraya paniculata (L.) Jack 'Dwarf'", main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'คล้าซิการ์', english_name: 'Calathea', scientific_name: 'Calathea sp.', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'คล้าหางนกยูง', english_name: 'Prayer Plant', scientific_name: 'Calathea rufibarba Fenzl', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ไทรเกาหลี', english_name: 'Korean Banyan', scientific_name: 'Ficus annulata', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'สนใบพาย', english_name: 'Buddhist Pine', scientific_name: 'Podocarpus macrophyllus (Thunb.) Sweet', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'เสน่ห์จันทร์แดง', english_name: 'King of Hearts', scientific_name: 'Homalomena rubescens (Roxb.) Kunth', main_category: 'softscape', subcategory: 'shrub', unit: 'mass' },
  { item_name: 'ปาล์มจีบ', english_name: 'Vanuatu Fan Palm', scientific_name: 'Licuala grandis H.Wendl.', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'กะตาด', english_name: 'Elephant Ear', scientific_name: 'Alocasia macrorrhizos (L.) G.Don', main_category: 'softscape', subcategory: 'shrub', unit: 'ต้น' },
  { item_name: 'หญ้านวลน้อย', english_name: 'Manila Grass', scientific_name: 'Zoysia matrella (L.) Merr.', main_category: 'softscape', subcategory: 'lawn', unit: 'ตร.ม.' },
  { item_name: 'หญ้ามาเลเซีย', english_name: 'Tropical Carpet Grass', scientific_name: 'Axonopus compressus', main_category: 'softscape', subcategory: 'lawn', unit: 'ตร.ม.' }
]

async function run() {
  for (const plant of plants) {
    const { data, error } = await supabase
      .from('document_item_catalog')
      .insert({
        ...plant,
        size_label: '-',
        material_price: 0,
        labor_price: 0,
        usage_count: 0
      })
      
    if (error) {
      if (error.code === '23505') {
        console.log(`Skipped (already exists): ${plant.item_name}`)
      } else {
        console.error(`Error inserting ${plant.item_name}:`, error)
      }
    } else {
      console.log(`Inserted: ${plant.item_name}`)
    }
  }
}

run()
