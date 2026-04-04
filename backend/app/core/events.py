"""Internal async event bus for inter-module communication."""

from __future__ import annotations

import asyncio
import fnmatch
import logging
from collections import defaultdict
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)

EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    """Async event bus with support for exact and wildcard subscriptions.

    Event types are dot-delimited strings such as ``"order.confirmed"``
    or ``"subscription.created"``.  Wildcard patterns follow ``fnmatch``
    rules -- e.g. ``"order.*"`` matches any event starting with ``order.``.
    """

    _instance: EventBus | None = None

    def __new__(cls) -> EventBus:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._handlers = defaultdict(list)
        return cls._instance

    _handlers: defaultdict[str, list[EventHandler]]

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Register *handler* for the given *event_type* (exact or wildcard).

        Args:
            event_type: Event name or glob pattern (e.g. ``"order.*"``).
            handler: Async callable receiving a ``dict`` payload.
        """
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """Remove a previously registered handler.

        Silently ignores handlers that are not subscribed.
        """
        handlers = self._handlers.get(event_type)
        if handlers and handler in handlers:
            handlers.remove(handler)
            if not handlers:
                del self._handlers[event_type]

    async def publish(self, event_type: str, data: dict[str, Any] | None = None) -> None:
        """Publish an event, invoking all matching handlers concurrently.

        Handlers registered for both exact matches and wildcard patterns
        that match *event_type* are executed.  Exceptions in individual
        handlers are logged but do not prevent other handlers from running.

        Args:
            event_type: The event to emit (e.g. ``"order.confirmed"``).
            data: Arbitrary payload forwarded to each handler.
        """
        payload = data or {}
        matched_handlers: list[EventHandler] = []

        for pattern, handlers in self._handlers.items():
            if pattern == event_type or fnmatch.fnmatch(event_type, pattern):
                matched_handlers.extend(handlers)

        if not matched_handlers:
            return

        results = await asyncio.gather(
            *(h(payload) for h in matched_handlers),
            return_exceptions=True,
        )

        for idx, result in enumerate(results):
            if isinstance(result, BaseException):
                logger.error(
                    "Event handler %s failed for '%s': %s",
                    matched_handlers[idx].__qualname__,
                    event_type,
                    result,
                )

    def clear(self) -> None:
        """Remove all registered handlers.  Useful in tests."""
        self._handlers.clear()


def get_event_bus() -> EventBus:
    """Return the EventBus singleton instance."""
    return EventBus()
