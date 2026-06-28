-- Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory_categories(id);

-- Insert default categories
INSERT INTO inventory_categories (name, color, order_index) VALUES 
('วัตถุดิบ (Ingredients)', '#4ADE80', 1),
('เครื่องดื่ม (Beverages)', '#3B82F6', 2),
('ขนม & เบเกอรี่ (Bakery & Snacks)', '#F472B6', 3),
('บรรจุภัณฑ์ (Packaging)', '#FACC15', 4),
('อุปกรณ์สิ้นเปลือง (Consumables)', '#F87171', 5),
('เบ็ดเตล็ด (Miscellaneous)', '#94A3B8', 6)
ON CONFLICT (name) DO NOTHING;
