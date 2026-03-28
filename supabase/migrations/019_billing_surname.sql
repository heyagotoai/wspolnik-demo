-- 019: Dodanie kolumny billing_surname do apartments
-- Nazwisko rozliczeniowe do automatycznego dopasowania wpłat z zestawień bankowych.
-- Nullable — admin może edytować w panelu; parser bank statement używa tej kolumny
-- do matchowania transakcji po nazwisku nadawcy / opisie przelewu.

ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS billing_surname TEXT;

COMMENT ON COLUMN apartments.billing_surname IS
  'Nazwisko rozliczeniowe (do dopasowania wpłat z zestawień bankowych)';

-- Wypełnienie billing_surname na podstawie rejestru lokale.json
-- Lokale mogą być osobnymi rekordami (np. "32" i "45" w jednej grupie)
-- lub jednym rekordem zbiorczym (np. "32,45") — ustawiamy oba warianty.

UPDATE apartments SET billing_surname = 'KOSIKOWSKI'   WHERE number = '1';
UPDATE apartments SET billing_surname = 'WEGNER'       WHERE number = '2';
UPDATE apartments SET billing_surname = 'WIERZGACZ'    WHERE number IN ('3,4A', '3', '4A');
UPDATE apartments SET billing_surname = 'ZAMBRZYCCY'   WHERE number = '6';
UPDATE apartments SET billing_surname = 'SULCZEWSKI'   WHERE number IN ('7', '7A');
UPDATE apartments SET billing_surname = 'CHEŁMOWSKI'   WHERE number = '8';
UPDATE apartments SET billing_surname = 'SULCZEWSKA'   WHERE number = '9';
UPDATE apartments SET billing_surname = 'CZAPIEWSKI'   WHERE number = '10';
UPDATE apartments SET billing_surname = 'BRUNN'        WHERE number IN ('11,16', '11', '16');
UPDATE apartments SET billing_surname = 'DRZAZGOWSKI'  WHERE number = '12';
UPDATE apartments SET billing_surname = 'PALIWODA'     WHERE number = '13';
UPDATE apartments SET billing_surname = 'MECHLIŃSCY'   WHERE number = '14';
UPDATE apartments SET billing_surname = 'GRZELAK'      WHERE number = '15';
UPDATE apartments SET billing_surname = 'ZIELIŃSKA'    WHERE number = '17';
UPDATE apartments SET billing_surname = 'AMW'          WHERE number IN ('18,31,42,44', '18', '31', '42', '44');
UPDATE apartments SET billing_surname = 'GRYGLEWSCY'   WHERE number = '19';
UPDATE apartments SET billing_surname = 'MACHNIKOWSCY' WHERE number = '20';
UPDATE apartments SET billing_surname = 'JUDEJKO'      WHERE number = '21';
UPDATE apartments SET billing_surname = 'CHEŁMOWSKA'   WHERE number = '22';
UPDATE apartments SET billing_surname = 'KLOSKOWSKI'   WHERE number = '23';
UPDATE apartments SET billing_surname = 'TRZASKA'      WHERE number = '24';
UPDATE apartments SET billing_surname = 'SZRAMA'       WHERE number IN ('25,26', '25', '26');
UPDATE apartments SET billing_surname = 'GÓRA'         WHERE number = '27';
UPDATE apartments SET billing_surname = 'FUDALI'       WHERE number = '28';
UPDATE apartments SET billing_surname = 'SZYMCZYK'     WHERE number = '29';
UPDATE apartments SET billing_surname = 'KIEDROWICZ'   WHERE number = '30';
UPDATE apartments SET billing_surname = 'KULAS'        WHERE number IN ('32,45', '32', '45');
UPDATE apartments SET billing_surname = 'JANTZEN'      WHERE number = '33';
UPDATE apartments SET billing_surname = 'DUNDA'        WHERE number = '34';
UPDATE apartments SET billing_surname = 'GOEBEL'       WHERE number = '35';
UPDATE apartments SET billing_surname = 'JANKOWSKI'    WHERE number = '36';
UPDATE apartments SET billing_surname = 'SZCZĘSNY'     WHERE number = '37';
UPDATE apartments SET billing_surname = 'KONOPSKI'     WHERE number = '38';
UPDATE apartments SET billing_surname = 'BRIEGER'      WHERE number = '39';
UPDATE apartments SET billing_surname = 'HAJDASZ'      WHERE number = '40';
UPDATE apartments SET billing_surname = 'CZAJKOWSKA'   WHERE number = '41';
UPDATE apartments SET billing_surname = 'WESTPAL'      WHERE number = '43';
UPDATE apartments SET billing_surname = 'CHRAPKOWSCY'  WHERE number = '46';
UPDATE apartments SET billing_surname = 'LEWIŃSKA'     WHERE number = '47';
