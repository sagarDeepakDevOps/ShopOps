import json
import logging
import socket
from datetime import UTC, datetime
from typing import Any

from app.core.config import get_settings
from app.middleware.correlation import REQUEST_ID_CONTEXT


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": REQUEST_ID_CONTEXT.get(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        for key in ("path", "method", "status_code", "duration_ms"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        return json.dumps(payload)


class LogstashTcpHandler(logging.Handler):
    def __init__(self, host: str, port: int) -> None:
        super().__init__()
        self.host = host
        self.port = port

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = self.format(record) + "\n"
            with socket.create_connection((self.host, self.port), timeout=1.0) as sock:
                sock.sendall(message.encode("utf-8"))
        except OSError:
            # Never break request processing if log transport is unavailable.
            return


def configure_logging(level: str = "INFO") -> None:
    settings = get_settings()
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    if settings.LOGSTASH_ENABLED:
        logstash_handler = LogstashTcpHandler(settings.LOGSTASH_HOST, settings.LOGSTASH_PORT)
        logstash_handler.setFormatter(JsonFormatter())
        root_logger.addHandler(logstash_handler)
