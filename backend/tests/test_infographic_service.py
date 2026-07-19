import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.infographic_service import generate_infographic_data


def _mock_llm(content: str):
    mock = MagicMock()
    mock.choices = [MagicMock(message=MagicMock(content=content))]
    return mock


SAMPLE_LAYOUT = {
    "main_idea": "DNA encodes genetic information through four nucleotide bases.",
    "layout_type": "concept",
    "color_theme": "green",
    "sections": [
        {
            "heading": "Nucleotide Bases",
            "body": "Adenine, Thymine, Cytosine, Guanine form the genetic alphabet.",
            "highlight": "four bases",
            "icon_hint": "circle",
        },
        {
            "heading": "Double Helix",
            "body": "Two complementary strands wind together forming the famous helix.",
            "highlight": "double helix",
            "icon_hint": "arrow",
        },
    ],
    "key_terms": ["DNA", "Nucleotide", "Helix", "Base pair"],
    "data_points": [],
    "visual_metaphor": "a DNA helix unraveling into labeled colored segments",
    "takeaway": "DNA is the blueprint of life encoded in four chemical bases.",
}


class TestGenerateInfographicData:

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_happy_path_full_pipeline(self, mock_image, mock_llm):
        mock_llm.return_value = _mock_llm(json.dumps(SAMPLE_LAYOUT))
        mock_image.return_value = "data:image/png;base64,fakebase64data"

        result = await generate_infographic_data(
            concept_label="DNA",
            context="DNA is a molecule that carries genetic instructions.",
            language="en",
        )

        assert result["title"] == "DNA"
        assert result["subtitle"] == SAMPLE_LAYOUT["main_idea"]
        assert result["takeaway"] == SAMPLE_LAYOUT["takeaway"]
        assert result["layout_type"] == "concept"
        assert result["color_theme"] == "green"
        assert len(result["sections"]) == 2
        assert len(result["key_terms"]) == 4
        assert result["data_points"] == []
        assert result["image_url"] == "data:image/png;base64,fakebase64data"
        assert "palette" in result
        assert "layout_meta" in result

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_pipeline_calls_stage1_then_stage2(self, mock_image, mock_llm):
        mock_llm.return_value = _mock_llm(json.dumps(SAMPLE_LAYOUT))
        mock_image.return_value = "data:image/png;base64,fake"

        await generate_infographic_data("DNA", "Some context.", "en")

        mock_llm.assert_called_once()
        mock_image.assert_called_once()
        _call = mock_image.call_args.kwargs
        assert _call["concept_label"] == "DNA"
        assert _call["layout_type"] == "concept"
        assert _call["color_theme"] == "green"
        assert _call["visual_metaphor"] == SAMPLE_LAYOUT["visual_metaphor"]
        assert _call["num_sections"] == 2

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_llm_failure_triggers_fallback(self, mock_image, mock_llm):
        mock_llm.side_effect = RuntimeError("LLM timeout")
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Some context.", "en")

        assert result["title"] == "DNA"
        assert result["subtitle"] == "DNA"
        assert result["layout_type"] == "concept"
        assert result["color_theme"] == "blue"
        assert len(result["sections"]) == 1
        assert result["sections"][0]["heading"] == "DNA"
        assert result["image_url"] == "data:image/png;base64,fake"

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_llm_returns_non_dict_triggers_fallback(self, mock_image, mock_llm):
        mock_llm.return_value = _mock_llm(json.dumps(["not", "a", "dict"]))
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Some context.", "en")

        assert result["layout_type"] == "concept"
        assert result["color_theme"] == "blue"

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_missing_layout_type_defaults_to_concept(self, mock_image, mock_llm):
        data = dict(SAMPLE_LAYOUT)
        del data["layout_type"]
        mock_llm.return_value = _mock_llm(json.dumps(data))
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Some context.", "en")
        assert result["layout_type"] == "concept"

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_missing_color_theme_defaults_to_blue(self, mock_image, mock_llm):
        data = dict(SAMPLE_LAYOUT)
        del data["color_theme"]
        mock_llm.return_value = _mock_llm(json.dumps(data))
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Some context.", "en")
        assert result["color_theme"] == "blue"
        assert result["palette"]["primary"] == "#1a73e8"

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_invalid_theme_uses_blue_fallback(self, mock_image, mock_llm):
        data = dict(SAMPLE_LAYOUT)
        data["color_theme"] = "nonexistent"
        mock_llm.return_value = _mock_llm(json.dumps(data))
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Some context.", "en")
        assert result["palette"]["label"] == "Corporate Blue"

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_context_truncated_to_exactly_4000_chars_in_stage1(self, mock_image, mock_llm):
        long_context = "A" * 10000
        mock_llm.return_value = _mock_llm(json.dumps(SAMPLE_LAYOUT))
        mock_image.return_value = "data:image/png;base64,fake"

        await generate_infographic_data("DNA", long_context, "en")

        _call_kwargs = mock_llm.call_args.kwargs
        user_msg = _call_kwargs["messages"][1]["content"]
        assert len(long_context) == 10000
        assert "A" * 4000 in user_msg
        assert "A" * 5000 not in user_msg

        exact_4000 = "A" * 4000
        assert exact_4000 in user_msg
        assert "A" * 4001 not in user_msg

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_fallback_truncates_context_to_exactly_100_chars(self, mock_image, mock_llm):
        long_context = "B" * 10000
        mock_llm.side_effect = RuntimeError("LLM timeout")
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", long_context, "en")

        assert result["sections"][0]["body"] == "B" * 100
        assert len(result["sections"][0]["body"]) == 100
        assert result["sections"][0]["body"] != "B" * 101

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_image_service_failure(self, mock_image, mock_llm):
        mock_llm.return_value = _mock_llm(json.dumps(SAMPLE_LAYOUT))
        mock_image.side_effect = RuntimeError("DALL-E API error")

        with pytest.raises(RuntimeError, match="DALL-E API error"):
            await generate_infographic_data("DNA", "Some context.", "en")

    @pytest.mark.asyncio
    @patch("app.services.llm_service._client.chat.completions.create")
    @patch("app.services.infographic_service.generate_concept_image")
    async def test_return_has_all_expected_keys(self, mock_image, mock_llm):
        mock_llm.return_value = _mock_llm(json.dumps(SAMPLE_LAYOUT))
        mock_image.return_value = "data:image/png;base64,fake"

        result = await generate_infographic_data("DNA", "Context.", "en")
        expected_keys = {
            "title", "subtitle", "takeaway",
            "layout_type", "layout_meta",
            "sections", "key_terms", "data_points",
            "color_theme", "palette", "image_url",
        }
        assert set(result.keys()) == expected_keys
