
export interface WorkoutSet {
  id: string;
  bodyPart: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface CardioData {
  type: 'Running' | 'Walking';
  duration: number; // minutes
  distance: number; // km
}

export interface DailyRecord {
  id: string;
  date: string;
  memo: string;
  workouts: WorkoutSet[];
  cardio?: CardioData;
  createdAt: number;
}

export interface DesignPattern {
  id: string;
  name: string;
  description: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    button: string;
    border: string;
  };
}
