package com.cook2cart.video_service.service;

import com.cook2cart.video_service.dto.VideoResponseDTO;
import com.cook2cart.video_service.kafka.event.VideoAudioReadyEvent;
import com.cook2cart.video_service.kafka.producer.VideoAudioReadyProducer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class VideoService {

    private static final Logger log = LoggerFactory.getLogger(VideoService.class);

    private static final Pattern YOUTUBE_VIDEO_ID_PATTERN =
            Pattern.compile("(?:v=|/)([a-zA-Z0-9_-]{11})");

    @Value("${video.output-dir}")
    private String videoOutputDir;

    @Value("${audio.output-dir}")
    private String audioOutputDir;

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${yt-dlp.path:yt-dlp}")
    private String ytDlpPath;

    private File resolvedVideoDir;
    private File resolvedAudioDir;

    private final VideoAudioReadyProducer videoAudioReadyProducer;

    @PostConstruct
    public void init() {
        resolvedVideoDir = Paths.get(videoOutputDir).toAbsolutePath().normalize().toFile();
        resolvedAudioDir = Paths.get(audioOutputDir).toAbsolutePath().normalize().toFile();

        if (!resolvedVideoDir.exists()) {
            resolvedVideoDir.mkdirs();
        }

        if (!resolvedAudioDir.exists()) {
            resolvedAudioDir.mkdirs();
        }

        log.info("Video output directory: {}", resolvedVideoDir);
        log.info("Audio output directory: {}", resolvedAudioDir);
    }

    public VideoResponseDTO processVideo(String youtubeUrl) throws Exception {
        return processVideo(youtubeUrl, null, null);
    }

    public VideoResponseDTO processVideo(String youtubeUrl, Long userId, Long videoId) throws Exception {

        log.info("Video processing started for URL: {}", youtubeUrl);

        String baseName = buildFileBaseName(youtubeUrl);
        String videoPath = new File(resolvedVideoDir, baseName + ".mp4").getAbsolutePath();
        String audioPath = new File(resolvedAudioDir, baseName + ".mp3").getAbsolutePath();

        downloadVideo(youtubeUrl, videoPath);
        extractAudio(videoPath, audioPath);
        publishAudioReadyEvent(userId, videoId, youtubeUrl, videoPath, audioPath);

        log.info("Video processing completed successfully");

        return new VideoResponseDTO(
                videoPath,
                audioPath,
                "SUCCESS",
                "Video downloaded and audio extracted successfully"
        );
    }

    private void publishAudioReadyEvent(Long userId, Long videoId, String videoUrl, String videoPath, String audioPath) {
        VideoAudioReadyEvent event = VideoAudioReadyEvent.builder()
                .userId(userId)
                .videoId(videoId)
                .videoUrl(videoUrl)
                .videoPath(videoPath)
                .audioPath(audioPath)
                .status("AUDIO_READY")
                .createdAt(LocalDateTime.now())
                .build();

        videoAudioReadyProducer.publish(event);
    }

    private void downloadVideo(String youtubeUrl, String outputPath) throws Exception {

        log.info("Starting video download...");

        ProcessBuilder processBuilder = new ProcessBuilder(
                ytDlpPath,
                "-f",
                "bestvideo[height<=480]+bestaudio/best[height<=480]/best",
                "--merge-output-format",
                "mp4",
                "--no-playlist",
                "--force-overwrites",
                "-o",
                outputPath,
                youtubeUrl
        );

        runCommand("Video download", processBuilder);

        log.info("Video downloaded successfully: {}", outputPath);
    }

    private void extractAudio(String videoPath, String audioPath) throws Exception {

        log.info("Starting audio extraction...");

        ProcessBuilder processBuilder = new ProcessBuilder(
                ffmpegPath,
                "-y",
                "-i",
                videoPath,
                "-vn",
                "-acodec", "libmp3lame",
                "-b:a", "128k",
                "-ar", "16000",
                "-ac", "1",
                audioPath
        );

        runCommand("Audio extraction", processBuilder);

        log.info("Audio extracted successfully: {}", audioPath);
    }

    private void runCommand(String step, ProcessBuilder processBuilder) throws Exception {
        processBuilder.redirectErrorStream(true);

        Process process;
        try {
            process = processBuilder.start();
        } catch (IOException ex) {
            log.error("{} command could not start", step, ex);
            throw new RuntimeException(step + " command could not start: " + ex.getMessage(), ex);
        }

        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            log.error("{} failed with exit code {}. Output: {}", step, exitCode, output);
            throw new RuntimeException(step + " failed: " + summarize(output));
        }
    }

    private String summarize(String output) {
        if (output == null || output.isBlank()) {
            return "No command output";
        }

        String compactOutput = output.replaceAll("\\s+", " ").trim();
        return compactOutput.length() > 500
                ? compactOutput.substring(0, 500) + "..."
                : compactOutput;
    }

    private String buildFileBaseName(String youtubeUrl) {
        String videoId = extractVideoId(youtubeUrl);
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);

        return videoId == null
                ? "recipe-" + uniqueSuffix
                : videoId + "-" + uniqueSuffix;
    }

    private String extractVideoId(String youtubeUrl) {
        if (youtubeUrl == null) {
            return null;
        }
        Matcher matcher = YOUTUBE_VIDEO_ID_PATTERN.matcher(youtubeUrl);
        return matcher.find() ? matcher.group(1) : null;
    }
}
