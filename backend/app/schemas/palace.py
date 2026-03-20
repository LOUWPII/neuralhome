from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.concept import Concept

class PalaceBase(BaseModel):
    title: str = Field(..., description="Title of the palace/document")
    subject: str | None = Field(None, description="Subject of study")
    description: str | None = Field(None, description="Visual description of the room")
    objectives: str | None = Field(None, description="Study objectives")
    theme_data: dict | None = Field(None, description="JSON representing visual theme params")

class PalaceCreate(PalaceBase):
    pass

class Palace(PalaceBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }

class PalaceWithConcepts(Palace):
    concepts: list[Concept] = []
    
    model_config = {
        "from_attributes": True
    }
