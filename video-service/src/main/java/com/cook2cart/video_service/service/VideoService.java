package com.cook2cart.video_service.service;

import com.cook2cart.video_service.dto.VideoResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;

@Slf4j
@Service
public class VideoService {

    public VideoResponseDTO processVideo(String youtubeUrl) throws Exception {

        log.info("Video processing started for URL: {}", youtubeUrl);

        File videoDir = new File("videos");
        File audioDir = new File("audio");

        if (!videoDir.exists()) {
            videoDir.mkdirs();
        }

        if (!audioDir.exists()) {
            audioDir.mkdirs();
        }

        String videoPath = "videos/recipe.mp4";
        String audioPath = "audio/recipe.wav";

        downloadVideo(youtubeUrl, videoPath);
        extractAudio(videoPath, audioPath);

        log.info("Video processing completed successfully");

        return new VideoResponseDTO(
                videoPath,
                audioPath,
                "SUCCESS",
                "Video downloaded and audio extracted successfully"
        );
    }

    private void downloadVideo(String youtubeUrl, String outputPath) throws Exception {

        log.info("Starting video download...");

        ProcessBuilder processBuilder = new ProcessBuilder(
                "yt-dlp",
                "-f",
                "bestvideo+bestaudio/best",
                "--merge-output-format",
                "mp4",
                "-o",
                outputPath,
                youtubeUrl
        );

        processBuilder.inheritIO();

        Process process = processBuilder.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            log.error("Video download failed");
            throw new RuntimeException("Video download failed");
        }

        log.info("Video downloaded successfully: {}", outputPath);
    }

    private void extractAudio(String videoPath, String audioPath) throws Exception {

        log.info("Starting audio extraction...");

        ProcessBuilder processBuilder = new ProcessBuilder(
                "ffmpeg",
                "-y",
                "-i",
                videoPath,
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                audioPath
        );

        processBuilder.inheritIO();

        Process process = processBuilder.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            log.error("Audio extraction failed");
            throw new RuntimeException("Audio extraction failed");
        }

        log.info("Audio extracted successfully: {}", audioPath);
    }
}