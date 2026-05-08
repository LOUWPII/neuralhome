"""
Asset mapping registry for Dynamic Mental Palaces.
Maps objects detected by the vision model to actual 3D models available in the frontend.
"""

def get_glb_for_type(object_type: str) -> str:
    """
    Given a generic object type detected by the vision LLM,
    returns the closest matching .glb filename from our predefined asset kit.
    """
    type_lower = object_type.lower()
    
    # Map synonyms to our 7 base models
    if any(word in type_lower for word in ["bed", "mattress", "cot"]):
        return "bed.glb"
    elif any(word in type_lower for word in ["desk", "table", "workstation"]):
        return "desk.glb"
    elif any(word in type_lower for word in ["chair", "seat", "stool", "sofa", "couch"]):
        return "chair.glb"
    elif any(word in type_lower for word in ["shelf", "bookcase", "bookshelf", "rack", "cabinet", "wardrobe", "closet"]):
        return "bookshelf.glb"
    elif any(word in type_lower for word in ["lamp", "light"]):
        return "lamp.glb"
    elif any(word in type_lower for word in ["plant", "flower", "pot", "tree"]):
        return "plant.glb"
    elif any(word in type_lower for word in ["window", "glass"]):
        return "window.glb"
        
    # Fallback to desk if we don't know what it is
    return "desk.glb"
