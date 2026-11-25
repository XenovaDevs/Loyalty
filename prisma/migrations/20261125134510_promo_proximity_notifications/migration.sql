-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rewardText" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stampsRequired" INTEGER,
    "pointsPerCurrency" DECIMAL,
    "pointsPerVisit" INTEGER,
    "couponCode" TEXT,
    "couponExpiresAt" DATETIME,
    "design" TEXT,
    "notifyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyMessages" TEXT,
    "notifyRadiusM" INTEGER,
    "notifyStartHour" INTEGER,
    "notifyEndHour" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Program" ("active", "businessId", "couponCode", "couponExpiresAt", "createdAt", "design", "id", "name", "pointsPerCurrency", "pointsPerVisit", "rewardText", "stampsRequired", "type", "updatedAt") SELECT "active", "businessId", "couponCode", "couponExpiresAt", "createdAt", "design", "id", "name", "pointsPerCurrency", "pointsPerVisit", "rewardText", "stampsRequired", "type", "updatedAt" FROM "Program";
DROP TABLE "Program";
ALTER TABLE "new_Program" RENAME TO "Program";
CREATE INDEX "Program_businessId_idx" ON "Program"("businessId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
