-- Migración para el módulo de Cuestionarios y su Historial

-- Estructura de la tabla para almacenar los cuestionarios generados por el LLM
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar la búsqueda por usuario y concepto
CREATE INDEX idx_quizzes_user_concept ON public.quizzes(user_id, concept_id);

-- Políticas RLS (Row Level Security) para proteger los cuestionarios
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quizzes"
    ON public.quizzes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes"
    ON public.quizzes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Opcional: tabla para guardar las evaluaciones/resultados de un cuestionario si se desea un historial de calificaciones más profundo
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    answers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results"
    ON public.quiz_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own results"
    ON public.quiz_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);
