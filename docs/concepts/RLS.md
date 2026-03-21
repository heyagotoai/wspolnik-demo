# Row Level Security (RLS)

Mechanizm PostgreSQL pozwalający kontrolować dostęp do **poszczególnych wierszy** tabeli na podstawie reguł (policies).

## Jak działa w naszym projekcie
- Każda tabela ma włączony RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Polityki definiują kto co widzi: `USING (warunek)` dla SELECT, `WITH CHECK (warunek)` dla INSERT
- Dwa helpery: `is_admin()` i `my_apartment_ids()` — oba [[SECURITY DEFINER]]

## Kluczowa zasada
RLS działa na poziomie bazy — nawet jeśli frontend lub API ma błąd, dane nie wyciekną. To **ostatnia linia obrony**.

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]] — pełne polityki
- [[Supabase]] — dostarcza RLS "z pudełka"
- [[SECURITY DEFINER]] — dlaczego helpery tego potrzebują
