FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask "youtube-transcript-api>=1.2.4" requests

COPY app.py .

EXPOSE 8089

CMD ["python", "app.py", "8089"]
