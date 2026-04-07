"""
Internal event bus for inter-module communication.

Phase 1: synchronous in-process events via callbacks.
Phase 2: Redis Pub/Sub.
Phase 3: RabbitMQ/Kafka.
"""

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4


@dataclass
class Event:
    event_type: str
    tenant_id: UUID
    payload: dict[str, Any]
    event_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    actor_id: UUID | None = None


class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Callable) -> None:
        self._handlers[event_type].append(handler)

    async def publish(self, event: Event) -> None:
        for handler in self._handlers.get(event.event_type, []):
            await handler(event)
        # Also fire wildcard handlers
        for handler in self._handlers.get("*", []):
            await handler(event)


# Singleton event bus instance
event_bus = EventBus()
