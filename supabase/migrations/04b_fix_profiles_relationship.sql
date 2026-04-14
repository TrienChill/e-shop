-- Patch: Fix lỗi relationship cho bảng return_requests
-- Chạy trong Supabase SQL Editor

-- 1. Thêm cột profiles_id (FK để RLS nhận diện được relationship với profiles)
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS profiles_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Cập nhật profiles_id cho các record hiện có (user_id = profiles.id vì cùng auth.users)
UPDATE public.return_requests
  SET profiles_id = user_id
  WHERE profiles_id IS NULL;

-- 3. Thêm trigger để tự động set profiles_id khi insert mới
CREATE OR REPLACE FUNCTION public.set_profiles_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profiles_id := NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_id_on_insert ON public.return_requests;
CREATE TRIGGER set_profiles_id_on_insert
  BEFORE INSERT ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_profiles_id_trigger();
