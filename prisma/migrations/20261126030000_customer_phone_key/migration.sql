-- Una tarjeta por cliente por comercio: teléfono normalizado único por comercio.

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "phoneKey" TEXT;

-- Backfill de clientes existentes con la MISMA regla que src/lib/phone.ts:
-- solo dígitos, sin "00" inicial, sin "549"/"54" (si queda largo suficiente),
-- sin ceros iniciales; válido si tiene entre 6 y 15 dígitos.
-- Si ya hubiera duplicados, solo el cliente más antiguo recibe la clave (los
-- demás quedan en NULL) para que el índice único se pueda crear sin perder datos.
WITH digits AS (
  SELECT id, "businessId", "createdAt",
         regexp_replace(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), '^00', '') AS d
  FROM "Customer"
), stripped AS (
  SELECT id, "businessId", "createdAt",
         regexp_replace(
           CASE
             WHEN d LIKE '549%' AND length(d) >= 12 THEN substr(d, 4)
             WHEN d LIKE '54%'  AND length(d) >= 11 THEN substr(d, 3)
             ELSE d
           END, '^0+', '') AS k
  FROM digits
), ranked AS (
  SELECT id, k,
         row_number() OVER (PARTITION BY "businessId", k ORDER BY "createdAt", id) AS rn
  FROM stripped
  WHERE length(k) BETWEEN 6 AND 15
)
UPDATE "Customer" c SET "phoneKey" = r.k
FROM ranked r
WHERE c.id = r.id AND r.rn = 1;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_phoneKey_key" ON "Customer"("businessId", "phoneKey");
