import { create } from 'zustand';
import {
  WorkoutSession,
  WorkoutSet,
  WorkoutExercise,
  Routine,
  Exercise,
  SetType,
} from '../types';
import { requestWakeLock, releaseWakeLock } from '../domain/gym/wakelock';
import { playNotificationSound } from '../lib/notifications';
import { calculateNextProgression, STARTER_ROUTINES } from '../domain/gym';
import { healthConnectProvider } from '../lib/health/HealthConnectProvider';

interface RestTimerState {
  active: boolean;
  targetEndTime: number; // timestamp in ms
  initialSeconds: number;
  remainingSeconds: number;
  exerciseName?: string;
}

interface WorkoutStoreState {
  // Active Workout State
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  routines: Routine[];
  
  // Floating Rest Timer
  restTimer: RestTimerState;

  // Actions
  startWorkout: (routine?: Routine, customName?: string) => void;
  minimizeWorkout: () => void;
  resumeWorkout: () => void;
  completeWorkout: () => WorkoutSession | null;
  cancelWorkout: () => void;
  
  // Exercise & Set Actions inside Active Workout
  addExerciseToSession: (exercise: Exercise) => void;
  removeExerciseFromSession: (exerciseIndex: number) => void;
  addSetToExercise: (exerciseIndex: number, type?: SetType) => void;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;

  // Timer Actions
  startRestTimer: (seconds: number, exerciseName?: string) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  tickRestTimer: () => void;

  // Routine Management Actions
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  loadInitialGymData: (userId?: string) => void;
}

const STORAGE_KEYS = {
  SESSIONS: 'steady_workout_sessions_v1',
  ROUTINES: 'steady_workout_routines_v1',
  ACTIVE: 'steady_active_workout_v1',
};

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
  activeSession: null,
  history: [],
  routines: STARTER_ROUTINES,
  restTimer: {
    active: false,
    targetEndTime: 0,
    initialSeconds: 0,
    remainingSeconds: 0,
  },

  loadInitialGymData: (userId?: string) => {
    try {
      const uid = userId || 'user_demo';
      const rawSessions = localStorage.getItem(`${STORAGE_KEYS.SESSIONS}_${uid}`);
      const rawRoutines = localStorage.getItem(`${STORAGE_KEYS.ROUTINES}_${uid}`);
      const rawActive = localStorage.getItem(`${STORAGE_KEYS.ACTIVE}_${uid}`);

      const history = rawSessions ? JSON.parse(rawSessions) : [];
      const routines = rawRoutines ? JSON.parse(rawRoutines) : STARTER_ROUTINES;
      const activeSession = rawActive ? JSON.parse(rawActive) : null;

      if (activeSession) {
        requestWakeLock();
      }

      set({ history, routines, activeSession });
    } catch (err) {
      console.warn('[useWorkoutStore] Error loading gym data:', err);
    }
  },

  startWorkout: (routine?: Routine, customName?: string) => {
    requestWakeLock();
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    const history = get().history;
    const routineId = routine?.id;
    const name = customName || routine?.name || 'Treino Livre';

    // Map exercises from routine with smart previous-load retrieval
    const exercises: WorkoutExercise[] = (routine?.exercises || []).map(cfg => {
      // Find previous performance for this exercise
      const prevSession = history.find(s => s.exercises.some(e => e.exerciseId === cfg.exerciseId));
      const prevExercise = prevSession?.exercises.find(e => e.exerciseId === cfg.exerciseId);
      const prevSets = prevExercise?.sets || [];

      const lastCompletedSet = prevSets.findLast(s => s.completed && s.type !== 'warmup');
      const baseWeight = lastCompletedSet?.weightKg || 20;

      // Calculate next target weight using progression engine
      const prog = calculateNextProgression(
        cfg.progression || 'double_progression',
        prevSets,
        cfg.targetRepRange || [8, 12],
        baseWeight
      );

      const sets: WorkoutSet[] = Array.from({ length: cfg.defaultSets || 3 }).map((_, idx) => ({
        id: `set_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        setNumber: idx + 1,
        type: 'normal',
        weightKg: prog.nextWeightKg || baseWeight,
        reps: prog.nextTargetReps || cfg.targetRepRange?.[0] || 10,
        targetReps: prog.nextTargetReps || cfg.targetRepRange?.[0] || 10,
        targetWeightKg: prog.nextWeightKg || baseWeight,
        completed: false,
      }));

      return {
        exerciseId: cfg.exerciseId,
        exerciseName: cfg.exerciseName || cfg.exerciseId,
        notes: cfg.notes,
        restSeconds: cfg.restSeconds || 90,
        sets,
        progression: cfg.progression,
      };
    });

    const newSession: WorkoutSession = {
      id: `workout_${Date.now()}`,
      routineId,
      name,
      date: today,
      startTime: nowIso,
      durationSeconds: 0,
      exercises,
      totalVolumeKg: 0,
      totalSets: 0,
      isCompleted: false,
    };

    set({ activeSession: newSession });
    try {
      localStorage.setItem(`${STORAGE_KEYS.ACTIVE}_current`, JSON.stringify(newSession));
    } catch {
      // ignore
    }
  },

  minimizeWorkout: () => {
    // Keep activeSession running in background while closing the modal
  },

  resumeWorkout: () => {
    requestWakeLock();
  },

  completeWorkout: () => {
    const session = get().activeSession;
    if (!session) return null;

    releaseWakeLock();
    get().stopRestTimer();

    const nowIso = new Date().toISOString();
    const durationSeconds = Math.max(
      60,
      Math.round((new Date(nowIso).getTime() - new Date(session.startTime).getTime()) / 1000)
    );

    // Calculate total volume and sets
    let totalVolumeKg = 0;
    let totalCompletedSets = 0;

    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          totalCompletedSets++;
          totalVolumeKg += (set.weightKg || 0) * (set.reps || 0);
        }
      });
    });

    const completedSession: WorkoutSession = {
      ...session,
      endTime: nowIso,
      durationSeconds,
      totalVolumeKg: Math.round(totalVolumeKg),
      totalSets: totalCompletedSets,
      isCompleted: true,
      updatedAt: nowIso,
    } as any;

    const updatedHistory = [completedSession, ...get().history];

    set({
      activeSession: null,
      history: updatedHistory,
    });

    try {
      localStorage.removeItem(`${STORAGE_KEYS.ACTIVE}_current`);
      localStorage.setItem(`${STORAGE_KEYS.SESSIONS}_current`, JSON.stringify(updatedHistory));
    } catch {
      // ignore
    }

    // Sync workout session to Health Connect (Android / Google Health / Samsung Health)
    healthConnectProvider.writeExerciseSession({
      title: completedSession.name || 'Treino SteadySync',
      startTime: session.startTime,
      endTime: nowIso,
      notes: `Volume: ${Math.round(totalVolumeKg)}kg | Séries concluídas: ${totalCompletedSets}`,
    }).catch(err => {
      console.warn('[WorkoutStore] Falha ao sincronizar com Health Connect:', err);
    });

    playNotificationSound();
    return completedSession;
  },

  cancelWorkout: () => {
    releaseWakeLock();
    get().stopRestTimer();
    set({ activeSession: null });
    try {
      localStorage.removeItem(`${STORAGE_KEYS.ACTIVE}_current`);
    } catch {
      // ignore
    }
  },

  addExerciseToSession: (exercise: Exercise) => {
    const session = get().activeSession;
    if (!session) return;

    const newExercise: WorkoutExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      restSeconds: 90,
      sets: [
        {
          id: `set_${Date.now()}_0`,
          setNumber: 1,
          type: 'normal',
          weightKg: 20,
          reps: 10,
          targetReps: 10,
          targetWeightKg: 20,
          completed: false,
        },
      ],
      progression: 'double_progression',
    };

    const updatedExercises = [...session.exercises, newExercise];
    const updatedSession = { ...session, exercises: updatedExercises };

    set({ activeSession: updatedSession });
    try {
      localStorage.setItem(`${STORAGE_KEYS.ACTIVE}_current`, JSON.stringify(updatedSession));
    } catch {
      // ignore
    }
  },

  removeExerciseFromSession: (exerciseIndex: number) => {
    const session = get().activeSession;
    if (!session) return;

    const updatedExercises = session.exercises.filter((_, idx) => idx !== exerciseIndex);
    const updatedSession = { ...session, exercises: updatedExercises };

    set({ activeSession: updatedSession });
  },

  addSetToExercise: (exerciseIndex: number, type: SetType = 'normal') => {
    const session = get().activeSession;
    if (!session || !session.exercises[exerciseIndex]) return;

    const exercise = session.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];

    const newSet: WorkoutSet = {
      id: `set_${Date.now()}_${exercise.sets.length}`,
      setNumber: exercise.sets.length + 1,
      type,
      weightKg: lastSet?.weightKg || 20,
      reps: lastSet?.reps || 10,
      targetReps: lastSet?.targetReps || 10,
      targetWeightKg: lastSet?.weightKg || 20,
      completed: false,
    };

    const updatedSets = [...exercise.sets, newSet];
    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    set({ activeSession: { ...session, exercises: updatedExercises } });
  },

  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<WorkoutSet>) => {
    const session = get().activeSession;
    if (!session || !session.exercises[exerciseIndex]) return;

    const updatedExercises = session.exercises.map((ex, eIdx) => {
      if (eIdx !== exerciseIndex) return ex;
      const updatedSets = ex.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s;
        return { ...s, ...updates };
      });
      return { ...ex, sets: updatedSets };
    });

    set({ activeSession: { ...session, exercises: updatedExercises } });
  },

  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => {
    const session = get().activeSession;
    if (!session || !session.exercises[exerciseIndex]) return;

    const exercise = session.exercises[exerciseIndex];
    const targetSet = exercise.sets[setIndex];
    const isNowCompleted = !targetSet.completed;

    const updatedExercises = session.exercises.map((ex, eIdx) => {
      if (eIdx !== exerciseIndex) return ex;
      const updatedSets = ex.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s;
        return {
          ...s,
          completed: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined,
        };
      });
      return { ...ex, sets: updatedSets };
    });

    set({ activeSession: { ...session, exercises: updatedExercises } });

    // When completing a set, auto trigger rest timer if duration > 0
    if (isNowCompleted && exercise.restSeconds > 0) {
      get().startRestTimer(exercise.restSeconds, exercise.exerciseName);
    }
  },

  removeSet: (exerciseIndex: number, setIndex: number) => {
    const session = get().activeSession;
    if (!session || !session.exercises[exerciseIndex]) return;

    const exercise = session.exercises[exerciseIndex];
    const updatedSets = exercise.sets
      .filter((_, idx) => idx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    set({ activeSession: { ...session, exercises: updatedExercises } });
  },

  // Rest Timer
  startRestTimer: (seconds: number, exerciseName?: string) => {
    const now = Date.now();
    const targetEndTime = now + seconds * 1000;

    set({
      restTimer: {
        active: true,
        targetEndTime,
        initialSeconds: seconds,
        remainingSeconds: seconds,
        exerciseName,
      },
    });
  },

  stopRestTimer: () => {
    set({
      restTimer: {
        active: false,
        targetEndTime: 0,
        initialSeconds: 0,
        remainingSeconds: 0,
      },
    });
  },

  adjustRestTimer: (deltaSeconds: number) => {
    const { restTimer } = get();
    if (!restTimer.active) return;

    const newTarget = restTimer.targetEndTime + deltaSeconds * 1000;
    const remaining = Math.max(0, Math.round((newTarget - Date.now()) / 1000));

    set({
      restTimer: {
        ...restTimer,
        targetEndTime: newTarget,
        remainingSeconds: remaining,
      },
    });
  },

  tickRestTimer: () => {
    const { restTimer } = get();
    if (!restTimer.active) return;

    const remaining = Math.max(0, Math.round((restTimer.targetEndTime - Date.now()) / 1000));

    if (remaining === 0) {
      playNotificationSound();
      set({
        restTimer: {
          active: false,
          targetEndTime: 0,
          initialSeconds: 0,
          remainingSeconds: 0,
        },
      });
    } else {
      set({
        restTimer: {
          ...restTimer,
          remainingSeconds: remaining,
        },
      });
    }
  },

  // Routines
  saveRoutine: (routine: Routine) => {
    const current = get().routines;
    const exists = current.some(r => r.id === routine.id);
    const updated = exists
      ? current.map(r => (r.id === routine.id ? routine : r))
      : [routine, ...current];

    set({ routines: updated });
    try {
      localStorage.setItem(`${STORAGE_KEYS.ROUTINES}_current`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  deleteRoutine: (id: string) => {
    const updated = get().routines.filter(r => r.id !== id);
    set({ routines: updated });
    try {
      localStorage.setItem(`${STORAGE_KEYS.ROUTINES}_current`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },
}));
