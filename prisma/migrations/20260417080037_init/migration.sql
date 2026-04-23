-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "volunteerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "supplies" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_day_timeSlot_ageGroup_key" ON "Activity"("day", "timeSlot", "ageGroup");
