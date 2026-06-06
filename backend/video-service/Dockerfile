FROM eclipse-temurin:21-jdk

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && pip3 install yt-dlp --break-system-packages \
    && mkdir -p /tmp/cook2cart/videos /tmp/cook2cart/audio \
    && chmod -R 777 /tmp/cook2cart \
    && apt-get clean

ENV VIDEO_OUTPUT_DIR=/tmp/cook2cart/videos
ENV AUDIO_OUTPUT_DIR=/tmp/cook2cart/audio

COPY target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
