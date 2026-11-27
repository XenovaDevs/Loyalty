-- QR del local + sello por escaneo; aviso de cercanía pasa del programa al
-- comercio; se elimina el programa de puntos por visita (check-in por cercanía).

-- 1) Comercio: token del QR (aleatorio por fila) + aviso de cercanía.
--    El radio del check-in pasa a ser el radio del aviso (mismo valor).
ALTER TABLE "Business" RENAME COLUMN "checkinRadiusM" TO "notifyRadiusM";

ALTER TABLE "Business"
ADD COLUMN "joinToken" TEXT NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text),
ADD COLUMN "notifyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notifyMessages" TEXT,
ADD COLUMN "notifyStartHour" INTEGER,
ADD COLUMN "notifyEndHour" INTEGER;

CREATE UNIQUE INDEX "Business_joinToken_key" ON "Business"("joinToken");

-- 2) Copiar los avisos que estaban configurados por programa al comercio:
--    mensajes de todos sus programas con aviso activo (sin repetir); radio y
--    franja horaria del más antiguo de ellos.
WITH enabled AS (
  SELECT * FROM "Program"
  WHERE "notifyEnabled" = true
    AND "notifyMessages" IS NOT NULL
    AND "notifyMessages" LIKE '[%'
), msgs AS (
  SELECT e."businessId", jsonb_agg(DISTINCT m.value) AS arr
  FROM enabled e, jsonb_array_elements_text(e."notifyMessages"::jsonb) AS m(value)
  WHERE btrim(m.value) <> ''
  GROUP BY e."businessId"
), firstp AS (
  SELECT DISTINCT ON ("businessId")
         "businessId", "notifyRadiusM", "notifyStartHour", "notifyEndHour"
  FROM enabled
  ORDER BY "businessId", "createdAt", id
)
UPDATE "Business" b SET
  "notifyEnabled"   = true,
  "notifyMessages"  = msgs.arr::text,
  "notifyRadiusM"   = COALESCE(f."notifyRadiusM", b."notifyRadiusM"),
  "notifyStartHour" = f."notifyStartHour",
  "notifyEndHour"   = f."notifyEndHour"
FROM msgs JOIN firstp f ON f."businessId" = msgs."businessId"
WHERE b.id = msgs."businessId";

-- 3) Fuera los programas de puntos (visita por cercanía y los tipos de puntos
--    sin UI). Borra en cascada sus membresías y eventos.
DELETE FROM "Program" WHERE type IN ('VISIT', 'POINTS', 'CASHBACK');

-- 4) Un solo programa de sellos activo por comercio (el QR suma ahí): se queda
--    activo el más antiguo; los demás se pausan (no se borra nada).
UPDATE "Program" p SET active = false
WHERE p.type = 'STAMPS' AND p.active = true
  AND p.id <> (
    SELECT q.id FROM "Program" q
    WHERE q."businessId" = p."businessId" AND q.type = 'STAMPS' AND q.active = true
    ORDER BY q."createdAt", q.id
    LIMIT 1
  );

-- 5) Columnas que ya no se usan.
ALTER TABLE "Program"
DROP COLUMN "notifyEnabled",
DROP COLUMN "notifyMessages",
DROP COLUMN "notifyRadiusM",
DROP COLUMN "notifyStartHour",
DROP COLUMN "notifyEndHour",
DROP COLUMN "pointsPerVisit";
