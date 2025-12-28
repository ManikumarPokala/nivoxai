FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

COPY backend-ai/requirements.txt backend-ai/requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY backend-ai/app ./app
COPY eval ./eval
COPY backend-ai/tests ./tests

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
