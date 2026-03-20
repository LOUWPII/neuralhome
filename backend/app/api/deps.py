from typing import Annotated
from fastapi import Depends, Header
from supabase import create_client, Client
from app.core.config import settings

def get_supabase(authorization: str = Header(None)) -> Client:
    # Initialize Supabase client
    client: Client = create_client(settings.supabase_url, settings.supabase_key)
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        client.postgrest.auth(token)
        # Also set for auth operations if needed
        client.auth.set_session(access_token=token, refresh_token="")
        
    return client

SupabaseDep = Annotated[Client, Depends(get_supabase)]
