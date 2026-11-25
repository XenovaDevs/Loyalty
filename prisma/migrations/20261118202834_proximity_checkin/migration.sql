-- AlterTable
ALTER TABLE "Program" ADD COLUMN "pointsPerVisit" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'START',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "checkinRadiusM" INTEGER NOT NULL DEFAULT 120,
    "openHour" INTEGER,
    "closeHour" INTEGER
);
INSERT INTO "new_Business" ("city", "createdAt", "id", "name", "plan", "slug", "updatedAt") SELECT "city", "createdAt", "id", "name", "plan", "slug", "updatedAt" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
