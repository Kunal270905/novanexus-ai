CREATE TABLE public.roi_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  label text NOT NULL,
  investment numeric NOT NULL CHECK (investment >= 0),
  return_amount numeric NOT NULL CHECK (return_amount >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.roi_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ROI entries"
  ON public.roi_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ROI entries"
  ON public.roi_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ROI entries"
  ON public.roi_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ROI entries"
  ON public.roi_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_roi_entries_updated_at
  BEFORE UPDATE ON public.roi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();