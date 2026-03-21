-- Drop unique constraint on ExerciseCardio.recordId to allow multiple cardio rows per record
ALTER TABLE "ExerciseCardio" DROP CONSTRAINT IF EXISTS "ExerciseCardio_recordId_key";
