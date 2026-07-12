-- Migration to add printer connection status columns
ALTER TABLE public.printers 
ADD COLUMN IF NOT EXISTS connection_status TEXT NOT NULL DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS connection_error TEXT,
ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;
