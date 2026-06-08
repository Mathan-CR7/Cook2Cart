package com.cook2cart.video_service.search;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/video")
@RequiredArgsConstructor
public class VideoSearchController {

    private final VideoSearchService videoSearchService;

    @GetMapping("/suggestions")
    public List<String> getSuggestions(@RequestParam String prefix) {
        return videoSearchService.getSuggestions(prefix);
    }

    @GetMapping("/search-history")
    public List<VideoSearchDocument> searchHistory(@RequestParam String keyword) {
        return videoSearchService.searchHistory(keyword);
    }

    @GetMapping("/user-video-search")
    public List<VideoSearchDocument> searchUserVideos(
            @RequestParam Long userId,
            @RequestParam String actionType,
            @RequestParam String keyword
    ) {
        return videoSearchService.searchUserVideos(userId, actionType, keyword);
    }

    @PostMapping("/index-video")
    public VideoSearchDocument indexVideo(@RequestBody VideoIndexRequest request) {
        return videoSearchService.indexVideo(request);
    }

    @DeleteMapping("/index/{id}")
    public void deleteIndex(@PathVariable String id) {
        videoSearchService.deleteById(id);
    }
}
