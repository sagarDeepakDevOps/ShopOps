import logging

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.core.config import get_settings
from app.db.session import engine

logger = logging.getLogger(__name__)


def setup_tracing(app: FastAPI) -> None:
    settings = get_settings()
    if not settings.OTEL_ENABLED:
        logger.info("tracing_disabled")
        return

    resource = Resource.create({"service.name": settings.OTEL_SERVICE_NAME})
    tracer_provider = TracerProvider(resource=resource)

    endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
    span_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))

    trace.set_tracer_provider(tracer_provider)
    FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
