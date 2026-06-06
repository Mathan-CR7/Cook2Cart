package com.cook2cart.video_service.controller;

import com.cook2cart.video_service.dto.YouTubeVideoDTO;
import com.cook2cart.video_service.dto.VideoRequestDTO;
import com.cook2cart.video_service.dto.VideoResponseDTO;
import com.cook2cart.video_service.service.VideoService;
import com.cook2cart.video_service.service.YouTubeSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/video")
@RequiredArgsConstructor
public class VideoController {

    private final YouTubeSearchService youTubeSearchService;
    private final VideoService videoService;

    @GetMapping("/search")
    public List<YouTubeVideoDTO> searchVideos(@RequestParam String query) {
        log.info("Search request received: {}", query);
        return youTubeSearchService.searchVideos(query);
    }

    @PostMapping("/process")
    public VideoResponseDTO processVideo(@RequestBody VideoRequestDTO request)
            throws Exception {

        log.info("Video process request received");
        return videoService.processVideo(request.getUrl());
    }

    @GetMapping("/download/audio")
    public ResponseEntity<Resource> downloadAudio() {
        log.info("Audio download request received");
        File file = new File("/data/audio/recipe.wav");
        if (!file.exists()) {
            log.warn("Audio file not found at: {}", file.getAbsolutePath());
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/wav"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .body(resource);
    }
}