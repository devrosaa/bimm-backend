-- CreateTable
CREATE TABLE "Make" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "makeId" TEXT NOT NULL,
    "makeName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "typeId" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    CONSTRAINT "VehicleType_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "Make" ("makeId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Make_makeId_key" ON "Make"("makeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_makeId_typeId_key" ON "VehicleType"("makeId", "typeId");
