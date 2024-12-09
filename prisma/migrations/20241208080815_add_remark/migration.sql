/*
  Warnings:

  - Added the required column `remark` to the `Config` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "remark" TEXT NOT NULL,
    "allowed_ip" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("allowed_ip", "created_at", "id", "private_key", "public_key", "updated_at") SELECT "allowed_ip", "created_at", "id", "private_key", "public_key", "updated_at" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
