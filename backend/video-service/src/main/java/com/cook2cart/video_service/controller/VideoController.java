package com.cook2cart.video_service.controller;

import com.cook2cart.video_service.dto.YouTubeVideoDTO;
import com.cook2cart.video_service.dto.VideoRequestDTO;
import com.cook2cart.video_service.dto.VideoResponseDTO;
import com.cook2cart.video_service.config.RedisCacheKeyUtil;
import com.cook2cart.video_service.service.VideoService;
import com.cook2cart.video_service.service.YouTubeSearchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;

@RestController
@RequestMapping("/video")
@RequiredArgsConstructor
public class VideoController {

    private static final Logger log = LoggerFactory.getLogger(VideoController.class);

    private final YouTubeSearchService youTubeSearchService;
    private final VideoService videoService;
    private final CacheManager cacheManager;

    @Value("${audio.output-dir}")
    private String audioOutputDir;

    @GetMapping("/search")
    public List<YouTubeVideoDTO> searchVideos(@RequestParam String query) {
        log.info("Search request received: {}", query);
        Cache cache = cacheManager.getCache("youtubeSearch");
        String cacheKey = RedisCacheKeyUtil.youtubeSearchKey(query);
        if (cache != null && cache.get(cacheKey) != null) {
            log.info("CACHE HIT: Returning result from Redis for key: {}", cacheKey);
        }
        return youTubeSearchService.searchVideos(query);
    }

    @PostMapping("/process")
    public VideoResponseDTO processVideo(@RequestBody VideoRequestDTO request)
            throws Exception {

        log.info("Video process request received");
        return videoService.processVideo(request.getUrl(), request.getUserId(), request.getVideoId());
    }

    @GetMapping("/download/audio")
    public ResponseEntity<Resource> downloadAudio(@RequestParam(value = "filename", required = false) String filename) {
        log.info("Audio download request received for filename: {}", filename);
        File file = (filename != null && !filename.trim().isEmpty())
                ? new File(audioOutputDir, filename)
                : new File(audioOutputDir, "recipe.mp3");
        if (!file.exists()) {
            log.warn("Audio file not found at: {}", file.getAbsolutePath());
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/mpeg"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .body(resource);
    }
}
