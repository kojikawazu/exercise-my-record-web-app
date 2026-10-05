-- 体重の履歴テーブルを追加する（#178）。1 日 1 件で、同日の保存は上書きする
CREATE TABLE "ExerciseWeightLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseWeightLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseWeightLog_date_key" ON "ExerciseWeightLog"("date");

-- RLS: 他の Exercise 系テーブルと同じポリシー（Prisma は RLS をバイパスする）
ALTER TABLE "ExerciseWeightLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON "ExerciseWeightLog" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseWeightLog" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseWeightLog" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseWeightLog" FOR DELETE USING (auth.uid() IS NOT NULL);

-- 既存の体重（現在値）を履歴の 1 件目として移す。記録日は最終更新日（UTC の日付）とする。
-- id は Prisma の cuid と形式が異なるが、主キーとしての一意性のみを使うため問題ない
INSERT INTO "ExerciseWeightLog" ("id", "date", "weightKg", "updatedAt")
SELECT gen_random_uuid()::text, date_trunc('day', "updatedAt"), "weightKg", CURRENT_TIMESTAMP
FROM "ExerciseProfile"
ORDER BY "createdAt" DESC
LIMIT 1;
