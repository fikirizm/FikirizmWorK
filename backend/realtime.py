from typing import Dict, Set
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, workspace_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(workspace_id, set()).add(ws)

    def disconnect(self, workspace_id: str, ws: WebSocket):
        room = self.rooms.get(workspace_id)
        if room and ws in room:
            room.discard(ws)

    async def broadcast(self, workspace_id: str, message: dict):
        room = self.rooms.get(workspace_id)
        if not room:
            return
        dead = []
        payload = json.dumps(message, default=str)
        for ws in list(room):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            room.discard(ws)


manager = ConnectionManager()
