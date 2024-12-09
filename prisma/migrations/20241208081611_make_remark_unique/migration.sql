/*
  Warnings:

  - A unique constraint covering the columns `[remark]` on the table `Config` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Config_remark_key" ON "Config"("remark");
