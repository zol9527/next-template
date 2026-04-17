-- Add reviewer_id to settlement_applications
ALTER TABLE public.settlement_applications
ADD COLUMN reviewer_id uuid REFERENCES public.users(id);
