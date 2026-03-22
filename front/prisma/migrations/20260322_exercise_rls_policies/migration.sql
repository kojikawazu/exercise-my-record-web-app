-- Exercise系テーブルにRLSポリシーを追加
-- SELECT: 全ユーザーが閲覧可能
-- INSERT/UPDATE/DELETE: 認証済みユーザーのみ（Supabase auth.uid()）

-- ExerciseRecord
CREATE POLICY "Public read" ON "ExerciseRecord" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseRecord" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseRecord" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseRecord" FOR DELETE USING (auth.uid() IS NOT NULL);

-- ExerciseWorkout
CREATE POLICY "Public read" ON "ExerciseWorkout" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseWorkout" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseWorkout" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseWorkout" FOR DELETE USING (auth.uid() IS NOT NULL);

-- ExerciseCardio
CREATE POLICY "Public read" ON "ExerciseCardio" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseCardio" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseCardio" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseCardio" FOR DELETE USING (auth.uid() IS NOT NULL);

-- ExerciseMaster
CREATE POLICY "Public read" ON "ExerciseMaster" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseMaster" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseMaster" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseMaster" FOR DELETE USING (auth.uid() IS NOT NULL);

-- ExerciseProfile
CREATE POLICY "Public read" ON "ExerciseProfile" FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON "ExerciseProfile" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update" ON "ExerciseProfile" FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete" ON "ExerciseProfile" FOR DELETE USING (auth.uid() IS NOT NULL);
