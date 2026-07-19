import json
import pytest
from unittest.mock import MagicMock, patch

from app.services.quiz_service import (
    generar_cuestionario,
    evaluar_respuesta_abierta,
    evaluar_respuesta_cerrada,
)

SAMPLE_QUIZ_JSON = json.dumps({
    "cuestionario": [
        {
            "id": 1,
            "enunciado": "¿Cuál es la capital de Francia?",
            "tipo": "opcion_multiple",
            "opciones": ["París", "Londres", "Berlín", "Madrid"],
            "respuesta_correcta": "París",
        },
        {
            "id": 2,
            "enunciado": "Explica brevemente qué es la fotosíntesis.",
            "tipo": "abierta",
        },
        {
            "id": 3,
            "enunciado": "El agua hierve a 100°C.",
            "tipo": "verdadero_falso",
            "opciones": ["Verdadero", "Falso"],
            "respuesta_correcta": "Verdadero",
        },
        {
            "id": 4,
            "enunciado": "¿Qué planeta es conocido como el rojo?",
            "tipo": "opcion_multiple",
            "opciones": ["Marte", "Venus", "Júpiter", "Saturno"],
            "respuesta_correcta": "Marte",
        },
        {
            "id": 5,
            "enunciado": "¿Cuál es el océano más grande?",
            "tipo": "opcion_multiple",
            "opciones": ["Atlántico", "Índico", "Pacífico", "Ártico"],
            "respuesta_correcta": "Pacífico",
        },
        {
            "id": 6,
            "enunciado": "Los humanos tienen 5 sentidos básicos.",
            "tipo": "verdadero_falso",
            "opciones": ["Verdadero", "Falso"],
            "respuesta_correcta": "Verdadero",
        },
        {
            "id": 7,
            "enunciado": "Describe el ciclo del agua.",
            "tipo": "abierta",
        },
    ],
})

EVAL_JSON = json.dumps({
    "correcta": True,
    "puntuacion": 92,
    "feedback": "Respuesta correcta. Mencionaste los puntos clave.",
})


def _mock_llm(content: str):
    mock = MagicMock()
    mock.choices = [MagicMock(message=MagicMock(content=content))]
    return mock


class TestGenerarCuestionario:

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_happy_path_returns_quiz(self, mock_create):
        contexto = "Francia es un país europeo cuya capital es París."
        mock_create.return_value = _mock_llm(SAMPLE_QUIZ_JSON)
        result = await generar_cuestionario(contexto, "es")
        assert "cuestionario" in result
        assert len(result["cuestionario"]) == 7
        types = [q["tipo"] for q in result["cuestionario"]]
        assert types.count("opcion_multiple") == 3
        assert types.count("abierta") == 2
        assert types.count("verdadero_falso") == 2
        _call_kwargs = mock_create.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert contexto in user_msg

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_english_language_directive(self, mock_create):
        mock_create.return_value = _mock_llm(SAMPLE_QUIZ_JSON)
        await generar_cuestionario("Some context.", "en")
        _call_kwargs = mock_create.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert "EXCLUSIVELY in English" in user_msg
        assert "EXCLUSIVAMENTE" not in user_msg

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_spanish_language_directive(self, mock_create):
        mock_create.return_value = _mock_llm(SAMPLE_QUIZ_JSON)
        await generar_cuestionario("Contexto en español.", "es")
        _call_kwargs = mock_create.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert "EXCLUSIVAMENTE en Español" in user_msg

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_raises_value_error_on_invalid_json(self, mock_create):
        mock_create.return_value = _mock_llm("not valid json")
        with pytest.raises(ValueError, match="JSON válido"):
            await generar_cuestionario("Some context.")

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_raises_runtime_error_on_api_failure(self, mock_create):
        mock_create.side_effect = RuntimeError("API timeout")
        with pytest.raises(RuntimeError, match="Error generando cuestionario"):
            await generar_cuestionario("Some context.")

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_handles_empty_response(self, mock_create):
        empty = json.dumps({"cuestionario": []})
        mock_create.return_value = _mock_llm(empty)
        result = await generar_cuestionario("Some context.")
        assert len(result["cuestionario"]) == 0

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_missing_cuestionario_key(self, mock_create):
        bad = json.dumps({"preguntas": []})
        mock_create.return_value = _mock_llm(bad)
        result = await generar_cuestionario("Some context.")
        assert result.get("cuestionario") is None


class TestEvaluarRespuestaAbierta:

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_happy_path_returns_evaluation(self, mock_create):
        pregunta = "¿Qué es la fotosíntesis?"
        respuesta = "Proceso donde las plantas convierten luz en energía."
        contexto_eval = "La fotosíntesis es el proceso..."
        mock_create.return_value = _mock_llm(EVAL_JSON)
        result = await evaluar_respuesta_abierta(pregunta, respuesta, contexto_eval)
        assert result["correcta"] is True
        assert result["puntuacion"] == 92
        assert "feedback" in result
        _call_kwargs = mock_create.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert pregunta in user_msg
        assert respuesta in user_msg
        assert contexto_eval in user_msg

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_raises_value_error_on_invalid_json(self, mock_create):
        mock_create.return_value = _mock_llm("bad json")
        with pytest.raises(ValueError, match="Error parseando"):
            await evaluar_respuesta_abierta("P?", "R.", "Ctx.")

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_raises_runtime_error_on_exception(self, mock_create):
        mock_create.side_effect = RuntimeError("fail")
        with pytest.raises(RuntimeError, match="Error evaluando"):
            await evaluar_respuesta_abierta("P?", "R.", "Ctx.")

    @pytest.mark.asyncio
    @patch("app.services.quiz_service._client.chat.completions.create")
    async def test_language_directive_passed(self, mock_create):
        mock_create.return_value = _mock_llm(EVAL_JSON)
        await evaluar_respuesta_abierta("P?", "R.", "Ctx.", language="en")
        _call_kwargs = mock_create.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert "EXCLUSIVELY in English" in user_msg


class TestEvaluarRespuestaCerrada:

    def test_exact_match(self):
        assert evaluar_respuesta_cerrada("París", "París") is True

    def test_case_insensitive(self):
        assert evaluar_respuesta_cerrada("parís", "París") is True

    def test_whitespace_insensitive(self):
        assert evaluar_respuesta_cerrada("  París  ", "París") is True

    def test_no_match(self):
        assert evaluar_respuesta_cerrada("Londres", "París") is False

    def test_empty_strings(self):
        assert evaluar_respuesta_cerrada("", "") is True
        assert evaluar_respuesta_cerrada("A", "") is False
