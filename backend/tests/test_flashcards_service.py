import json
import pytest
from unittest.mock import MagicMock, patch

from app.services.flashcards_service import generar_flashcards


def _mock_llm(content: str):
    mock = MagicMock()
    mock.choices = [MagicMock(message=MagicMock(content=content))]
    return mock


def _build_flashcards(n: int):
    cards = []
    for i in range(1, n + 1):
        tipo = "pregunta" if i % 2 == 1 else "completar"
        if tipo == "pregunta":
            cards.append({
                "id": i,
                "tipo": tipo,
                "frente": f"¿Qué es el concepto {i}?",
                "reverso": f"Es la definición de {i}.",
            })
        else:
            cards.append({
                "id": i,
                "tipo": tipo,
                "frente": f"El concepto ___ es importante.",
                "reverso": f"concepto {i}",
            })
    return cards


class TestGenerarFlashcards:

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_happy_path_returns_10_flashcards(self, mock_create):
        payload = json.dumps({"flashcards": _build_flashcards(10)})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto de estudio.")
        assert "flashcards" in result
        assert len(result["flashcards"]) == 10

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_both_types_present(self, mock_create):
        payload = json.dumps({"flashcards": _build_flashcards(10)})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto.")
        tipos = {c["tipo"] for c in result["flashcards"]}
        assert "pregunta" in tipos
        assert "completar" in tipos

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_each_card_has_required_fields(self, mock_create):
        payload = json.dumps({"flashcards": _build_flashcards(10)})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto.")
        for card in result["flashcards"]:
            assert "id" in card
            assert "tipo" in card
            assert "frente" in card
            assert "reverso" in card

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_handles_fewer_than_10_cards(self, mock_create):
        payload = json.dumps({"flashcards": _build_flashcards(3)})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto.")
        assert len(result["flashcards"]) == 3

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_raises_value_error_on_invalid_json(self, mock_create):
        mock_create.return_value = _mock_llm("{{{ broken json")
        with pytest.raises(ValueError, match="JSON válido"):
            await generar_flashcards("Contexto.")

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_raises_runtime_error_on_api_exception(self, mock_create):
        mock_create.side_effect = RuntimeError("API unreachable")
        with pytest.raises(RuntimeError, match="Error generando flashcards"):
            await generar_flashcards("Contexto.")

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_empty_flashcards_array(self, mock_create):
        payload = json.dumps({"flashcards": []})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto.")
        assert len(result["flashcards"]) == 0

    @pytest.mark.asyncio
    @patch("app.services.flashcards_service._client.chat.completions.create")
    async def test_missing_flashcards_key(self, mock_create):
        payload = json.dumps({"tarjetas": []})
        mock_create.return_value = _mock_llm(payload)
        result = await generar_flashcards("Contexto.")
        assert result.get("flashcards") is None
