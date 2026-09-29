import { Exercise, Routine } from '../../types';

export const CDN_BASE_IMAGE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/';
export const CDN_BASE_VIDEO = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/';

/**
 * High-frequency canonical exercise database.
 * Loaded instantly with zero overhead.
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  // CHEST / PEITO
  {
    id: 'ex_bench_press_barbell',
    name: 'Supino Reto com Barra',
    bodyPart: 'chest',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    category: 'strength',
    instructions: [
      'Deite-se no banco com os pés firmes no chão.',
      'Segure a barra com pegada ligeiramente mais larga que os ombros.',
      'Desça a barra de forma controlada até a linha média do peitoral.',
      'Empurre a barra estendendo os cotovelos sem perder a retração escapular.',
    ],
  },
  {
    id: 'ex_incline_dumbbell_press',
    name: 'Supino Inclinado com Halteres',
    bodyPart: 'chest',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    category: 'hypertrophy',
    instructions: [
      'Ajuste o banco em uma inclinação de 30° a 45°.',
      'Posicione os halteres acima do peitoral superior com os antebraços verticais.',
      'Desça até sentir um bom alongamento das fibras superiores.',
      'Pressione os halteres para cima convergindo ligeiramente no topo.',
    ],
  },
  {
    id: 'ex_cable_crossover',
    name: 'Crucifixo no Crossover (Cabo)',
    bodyPart: 'chest',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    category: 'hypertrophy',
  },
  {
    id: 'ex_dips_chest',
    name: 'Mergulho em Barras Paralelas',
    bodyPart: 'chest',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'bodyweight',
    category: 'strength',
    isBodyweight: true,
  },

  // BACK / COSTAS
  {
    id: 'ex_deadlift_barbell',
    name: 'Levantamento Terra Convencional',
    bodyPart: 'back',
    targetMuscle: 'back',
    secondaryMuscles: ['glutes', 'hamstrings', 'traps', 'forearms'],
    equipment: 'barbell',
    category: 'strength',
    instructions: [
      'Posicione os pés na largura do quadril com a barra sobre o meio do pé.',
      'Segure a barra firme, projete o peito para frente e trave a coluna neutra.',
      'Empurre o chão com os pés mantendo a barra rente às pernas.',
      'Fique ereto no topo sem hiperestender a lombar.',
    ],
  },
  {
    id: 'ex_pullup',
    name: 'Barra Fixa Pronada (Pull-up)',
    bodyPart: 'back',
    targetMuscle: 'lats',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'bodyweight',
    category: 'strength',
    isBodyweight: true,
  },
  {
    id: 'ex_barbell_row',
    name: 'Remada Curvada com Barra',
    bodyPart: 'back',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'traps', 'lower_back'],
    equipment: 'barbell',
    category: 'strength',
  },
  {
    id: 'ex_lat_pulldown',
    name: 'Puxada Alta no Pulley',
    bodyPart: 'back',
    targetMuscle: 'lats',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    category: 'hypertrophy',
  },
  {
    id: 'ex_seated_cable_row',
    name: 'Remada Baixa no Cabo',
    bodyPart: 'back',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'traps'],
    equipment: 'cable',
    category: 'hypertrophy',
  },

  // SHOULDERS / OMBROS
  {
    id: 'ex_overhead_press_barbell',
    name: 'Desenvolvimento Militar com Barra (OHP)',
    bodyPart: 'shoulders',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'traps'],
    equipment: 'barbell',
    category: 'strength',
  },
  {
    id: 'ex_lateral_raise_dumbbell',
    name: 'Elevação Lateral com Halteres',
    bodyPart: 'shoulders',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['traps'],
    equipment: 'dumbbell',
    category: 'hypertrophy',
  },
  {
    id: 'ex_face_pull',
    name: 'Face Pull na Polia (Deltóide Posterior & Manguito)',
    bodyPart: 'shoulders',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['traps', 'neck'],
    equipment: 'cable',
    category: 'hypertrophy',
  },

  // LEGS / PERNAS
  {
    id: 'ex_squat_barbell',
    name: 'Agachamento Livre com Barra',
    bodyPart: 'quads',
    targetMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'lower_back'],
    equipment: 'barbell',
    category: 'strength',
  },
  {
    id: 'ex_leg_press_45',
    name: 'Leg Press 45°',
    bodyPart: 'quads',
    targetMuscle: 'quads',
    secondaryMuscles: ['glutes'],
    equipment: 'machine',
    category: 'hypertrophy',
  },
  {
    id: 'ex_romanian_deadlift',
    name: 'Stiff / RDL com Halteres ou Barra',
    bodyPart: 'hamstrings',
    targetMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'lower_back'],
    equipment: 'barbell',
    category: 'strength',
  },
  {
    id: 'ex_leg_curl_seated',
    name: 'Mesa / Cadeira Flexora',
    bodyPart: 'hamstrings',
    targetMuscle: 'hamstrings',
    equipment: 'machine',
    category: 'hypertrophy',
  },
  {
    id: 'ex_calf_raise_standing',
    name: 'Elevação de Panturrilha em Pé',
    bodyPart: 'calves',
    targetMuscle: 'calves',
    equipment: 'machine',
    category: 'hypertrophy',
  },

  // ARMS / BRAÇOS
  {
    id: 'ex_barbell_biceps_curl',
    name: 'Rosca Direta com Barra W',
    bodyPart: 'biceps',
    targetMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    category: 'hypertrophy',
  },
  {
    id: 'ex_incline_dumbbell_curl',
    name: 'Rosca Inclinada no Banco',
    bodyPart: 'biceps',
    targetMuscle: 'biceps',
    equipment: 'dumbbell',
    category: 'hypertrophy',
  },
  {
    id: 'ex_triceps_pushdown_cable',
    name: 'Tríceps Polia com Corda',
    bodyPart: 'triceps',
    targetMuscle: 'triceps',
    equipment: 'cable',
    category: 'hypertrophy',
  },
  {
    id: 'ex_skull_crusher',
    name: 'Tríceps Testa com Halteres ou Barra',
    bodyPart: 'triceps',
    targetMuscle: 'triceps',
    equipment: 'dumbbell',
    category: 'hypertrophy',
  },

  // CORE / ABS
  {
    id: 'ex_hanging_leg_raise',
    name: 'Elevação de Pernas na Barra Fixa',
    bodyPart: 'abs',
    targetMuscle: 'abs',
    equipment: 'bodyweight',
    category: 'hypertrophy',
    isBodyweight: true,
  },
  {
    id: 'ex_plank_hold',
    name: 'Prancha Isométrica',
    bodyPart: 'abs',
    targetMuscle: 'abs',
    equipment: 'bodyweight',
    category: 'timed',
    isTimed: true,
  },
];

/**
 * Pre-configured scientifically periodized starter routines.
 */
export const STARTER_ROUTINES: Routine[] = [
  // 1. PUSH (Peito, Ombros, Tríceps)
  {
    id: 'routine_ppl_push',
    name: 'Push (Peito, Ombros & Tríceps)',
    description: 'Foco no padrão de empurrar horizontal e vertical.',
    emoji: '🔥',
    targetWeekday: 1, // Segunda
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'ex_bench_press_barbell',
        exerciseName: 'Supino Reto com Barra',
        defaultSets: 4,
        targetRepRange: [6, 8],
        restSeconds: 120,
        progression: 'greyskull',
      },
      {
        exerciseId: 'ex_incline_dumbbell_press',
        exerciseName: 'Supino Inclinado com Halteres',
        defaultSets: 3,
        targetRepRange: [8, 12],
        restSeconds: 90,
        progression: 'double_progression',
      },
      {
        exerciseId: 'ex_overhead_press_barbell',
        exerciseName: 'Desenvolvimento Militar com Barra (OHP)',
        defaultSets: 3,
        targetRepRange: [8, 10],
        restSeconds: 90,
        progression: 'linear',
      },
      {
        exerciseId: 'ex_lateral_raise_dumbbell',
        exerciseName: 'Elevação Lateral com Halteres',
        defaultSets: 4,
        targetRepRange: [12, 15],
        restSeconds: 60,
        progression: 'double_progression',
      },
      {
        exerciseId: 'ex_triceps_pushdown_cable',
        exerciseName: 'Tríceps Polia com Corda',
        defaultSets: 3,
        targetRepRange: [10, 12],
        restSeconds: 60,
        progression: 'double_progression',
      },
    ],
  },

  // 2. PULL (Costas, Deltóide Posterior & Bíceps)
  {
    id: 'routine_ppl_pull',
    name: 'Pull (Costas, Trapézio & Bíceps)',
    description: 'Foco no padrão de puxar vertical e horizontal e espessura dorsal.',
    emoji: '⚡',
    targetWeekday: 2, // Terça
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'ex_barbell_row',
        exerciseName: 'Remada Curvada com Barra',
        defaultSets: 4,
        targetRepRange: [6, 8],
        restSeconds: 120,
        progression: 'greyskull',
      },
      {
        exerciseId: 'ex_pullup',
        exerciseName: 'Barra Fixa Pronada (Pull-up)',
        defaultSets: 3,
        targetRepRange: [8, 10],
        restSeconds: 90,
        progression: 'bodyweight',
      },
      {
        exerciseId: 'ex_face_pull',
        exerciseName: 'Face Pull na Polia',
        defaultSets: 3,
        targetRepRange: [12, 15],
        restSeconds: 60,
        progression: 'double_progression',
      },
      {
        exerciseId: 'ex_barbell_biceps_curl',
        exerciseName: 'Rosca Direta com Barra W',
        defaultSets: 3,
        targetRepRange: [8, 12],
        restSeconds: 75,
        progression: 'double_progression',
      },
    ],
  },

  // 3. LEGS (Quadríceps, Isquiotibiais & Panturrilhas)
  {
    id: 'routine_ppl_legs',
    name: 'Legs (Quadríceps, Posteriores & Panturrilha)',
    description: 'Cadeia anterior e posterior completa de membros inferiores.',
    emoji: '🦵',
    targetWeekday: 4, // Quinta
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'ex_squat_barbell',
        exerciseName: 'Agachamento Livre com Barra',
        defaultSets: 4,
        targetRepRange: [6, 8],
        restSeconds: 120,
        progression: 'greyskull',
      },
      {
        exerciseId: 'ex_romanian_deadlift',
        exerciseName: 'Stiff / RDL com Halteres ou Barra',
        defaultSets: 3,
        targetRepRange: [8, 10],
        restSeconds: 90,
        progression: 'linear',
      },
      {
        exerciseId: 'ex_leg_press_45',
        exerciseName: 'Leg Press 45°',
        defaultSets: 3,
        targetRepRange: [10, 12],
        restSeconds: 90,
        progression: 'double_progression',
      },
      {
        exerciseId: 'ex_calf_raise_standing',
        exerciseName: 'Elevação de Panturrilha em Pé',
        defaultSets: 4,
        targetRepRange: [15, 20],
        restSeconds: 60,
        progression: 'double_progression',
      },
    ],
  },
];
