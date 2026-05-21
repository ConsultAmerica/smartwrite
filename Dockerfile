# SmartWrite AI — single container (API + built web UI) for free hosts like Render
FROM node:20-alpine AS frontend
WORKDIR /build
COPY desktop-app/package.json desktop-app/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY desktop-app/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    SERVE_WEB=1 \
    LANGUAGETOOL_API_URL=https://api.languagetool.org/v2/check \
    LLM_PROVIDER= \
    HOST=0.0.0.0

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY database/ ./database/
COPY --from=frontend /build/dist ./desktop-app/dist

WORKDIR /app/backend
EXPOSE 8002

# Render and others inject PORT; default 8002 for local docker run
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8002}
