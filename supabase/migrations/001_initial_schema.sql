-- ============================================
-- WM GABI - Schemat bazy danych
-- Migracja 001: Tabele podstawowe
-- ============================================

-- Mieszkańcy (rozszerzenie auth.users)
CREATE TABLE residents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  apartment_number TEXT,
  role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'resident')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lokale mieszkalne
CREATE TABLE apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  area_m2 DECIMAL(8,2),
  share DECIMAL(10,8),
  owner_resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Naliczenia miesięczne
CREATE TABLE charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('eksploatacja', 'fundusz_remontowy', 'woda', 'smieci', 'ogrzewanie', 'inne')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Importowane wyciągi bankowe
CREATE TABLE bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_balance DECIMAL(12,2),
  closing_balance DECIMAL(12,2),
  statement_date DATE,
  transactions_count INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES residents(id),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wpłaty (z importu bankowego)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  booking_date DATE,
  title TEXT,
  bank_reference TEXT,
  matched_automatically BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_admin BOOLEAN NOT NULL DEFAULT false,
  bank_statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dokumenty
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('regulamin', 'protokol', 'formularz', 'uchwala', 'sprawozdanie', 'inne')),
  file_path TEXT NOT NULL,
  file_size TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES residents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ogłoszenia
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ważne terminy
CREATE TABLE important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uchwały (przyszłość - tworzymy strukturę teraz)
CREATE TABLE resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  voting_start DATE,
  voting_end DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'voting', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Głosy (przyszłość)
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID NOT NULL REFERENCES resolutions(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('za', 'przeciw', 'wstrzymuje')),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resolution_id, resident_id)
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indeksy
-- ============================================

CREATE INDEX idx_residents_email ON residents(email);
CREATE INDEX idx_residents_apartment ON residents(apartment_number);
CREATE INDEX idx_residents_role ON residents(role);

CREATE INDEX idx_apartments_number ON apartments(number);
CREATE INDEX idx_apartments_owner ON apartments(owner_resident_id);

CREATE INDEX idx_charges_apartment ON charges(apartment_id);
CREATE INDEX idx_charges_month ON charges(month);

CREATE INDEX idx_payments_apartment ON payments(apartment_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_statement ON payments(bank_statement_id);
CREATE INDEX idx_payments_confirmed ON payments(confirmed_by_admin);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_public ON documents(is_public);

CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

CREATE INDEX idx_important_dates_date ON important_dates(date);

CREATE INDEX idx_resolutions_status ON resolutions(status);

CREATE INDEX idx_votes_resolution ON votes(resolution_id);
CREATE INDEX idx_votes_resident ON votes(resident_id);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- Trigger: auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_apartments_updated_at
  BEFORE UPDATE ON apartments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
