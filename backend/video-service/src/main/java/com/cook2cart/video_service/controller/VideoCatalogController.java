package com.cook2cart.video_service.controller;

import com.cook2cart.video_service.dto.*;
import com.cook2cart.video_service.entity.UserVideoActionType;
import com.cook2cart.video_service.service.VideoCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoCatalogController {

    private final VideoCatalogService videoCatalogService;

    @PostMapping
    public VideoDTO saveVideo(@RequestBody VideoCreateRequest request) {
        return videoCatalogService.saveVideo(request);
    }

    @GetMapping
    public List<VideoDTO> getVideos() {
        return videoCatalogService.getVideos();
    }

    @PostMapping("/processed")
    public ProcessedVideoDTO saveProcessedVideo(@RequestBody ProcessedVideoCreateRequest request) {
        return videoCatalogService.saveProcessedVideo(request);
    }

    @GetMapping("/processed/user/{userId}")
    public List<ProcessedVideoDTO> getProcessedVideosByUser(@PathVariable Long userId) {
        return videoCatalogService.getProcessedVideosByUser(userId);
    }

    @PostMapping("/actions")
    public UserVideoActionDTO saveUserVideoAction(@RequestBody UserVideoActionRequest request) {
        return videoCatalogService.saveUserVideoAction(request);
    }

    @GetMapping("/actions/user/{userId}")
    public List<UserVideoActionDTO> getUserVideoActions(
            @PathVariable Long userId,
            @RequestParam UserVideoActionType actionType
    ) {
        return videoCatalogService.getUserVideoActions(userId, actionType);
    }

    @DeleteMapping("/actions")
    public void deleteUserVideoAction(
            @RequestParam Long userId,
            @RequestParam Long videoId,
            @RequestParam UserVideoActionType actionType
    ) {
        videoCatalogService.deleteUserVideoAction(userId, videoId, actionType);
    }
}
