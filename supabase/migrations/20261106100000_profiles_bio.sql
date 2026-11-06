-- Add bio column to profiles table so user biography is persisted
alter table public.profiles
  add column if not exists bio text;
