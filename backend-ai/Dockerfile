FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

RUN pip install --no-cache-dir fastapi uvicorn scikit-learn numpy pandas pydantic

COPY app ./app
COPY eval ./eval

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
