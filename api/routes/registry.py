# api/routes/registry.py
from fastapi import APIRouter
from api.services.registry_service import get_models_registry

router = APIRouter()

@router.get("/models/registry")
def models_registry():
    return get_models_registry()