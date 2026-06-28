-- 1. ลบ Constraint เดิมที่มีปัญหา (อาจจะสะกดผิด หรือรับแค่ 'daily')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_salary_type_check;

-- 2. สร้าง Constraint ใหม่ให้รองรับทั้ง 'daily' และ 'monthly'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_salary_type_check CHECK (salary_type IN ('daily', 'monthly'));
