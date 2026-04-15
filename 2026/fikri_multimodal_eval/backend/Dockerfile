FROM python:3.11-slim

WORKDIR /app

# Install system deps for lm-eval / lmms-eval native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ git curl \
    && rm -rf /var/lib/apt/lists/*

# uv: parallel resolver, no backtracking — vastly faster than pip for heavy ML deps
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:/root/.local/bin:$PATH"

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY . .

# Persistent results volume mount point
RUN mkdir -p /app/data

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
