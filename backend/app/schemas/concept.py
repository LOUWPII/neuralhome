from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class ConceptBase(BaseModel):
    label: str = Field(..., description="Name of the concept")
    position_x: float = Field(..., description="X coordinate in 3D space")
    position_y: float = Field(..., description="Y coordinate in 3D space")
    position_z: float = Field(..., description="Z coordinate in 3D space")
    status: float = Field(default=0.0, description="Retention level (0.0 to 1.0)")
    context: str = Field(..., description="Original text from PDF for the tutor")
    feynman_summary: str | None = Field(None, description="Simplified summary (5yo level)")
    model_type: str | None = Field(None, description="3D model type to use")

class ConceptCreate(ConceptBase):
    pass

class Concept(ConceptBase):
    id: UUID
    palace_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }
