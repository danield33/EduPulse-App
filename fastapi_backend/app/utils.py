from fastapi.routing import APIRoute

def simple_generate_unique_route_id(route: APIRoute):
    """Generate stable unique IDs even for untagged routes."""
    tag = route.tags[0] if route.tags else "default"
    name = route.name or "untitled"
    return f"{tag}-{name}"