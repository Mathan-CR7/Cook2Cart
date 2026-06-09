package com.cook2cart.video_service.service;

import com.cook2cart.video_service.dto.YouTubeVideoDTO;
import com.cook2cart.video_service.search.VideoSearchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class YouTubeSearchService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeSearchService.class);

    @Value("${youtube.api.key}")
    private String apiKey;

    @Value("${youtube.search.url}")
    private String searchUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final VideoSearchService videoSearchService;

    @Cacheable(
            cacheNames = "youtubeSearch",
            key = "T(com.cook2cart.video_service.config.RedisCacheKeyUtil).youtubeSearchKey(#query)"
    )
    public List<YouTubeVideoDTO> searchVideos(String query) {

        try {
            log.info("CACHE MISS: Calling YouTube API and storing result in Redis for query: {}", query);
            String encodedQuery = URLEncoder.encode(query + " recipe", StandardCharsets.UTF_8);

            String url = searchUrl
                    + "?part=snippet"
                    + "&q=" + encodedQuery
                    + "&type=video"
                    + "&maxResults=5"
                    + "&key=" + apiKey;

            log.info("Searching YouTube videos for query: {}", query);

            Map response = restTemplate.getForObject(url, Map.class);

            List<Map<String, Object>> items =
                    (List<Map<String, Object>>) response.get("items");

            List<YouTubeVideoDTO> videos = new ArrayList<>();

            for (Map<String, Object> item : items) {

                Map<String, Object> id =
                        (Map<String, Object>) item.get("id");

                Map<String, Object> snippet =
                        (Map<String, Object>) item.get("snippet");

                Map<String, Object> thumbnails =
                        (Map<String, Object>) snippet.get("thumbnails");

                Map<String, Object> medium =
                        (Map<String, Object>) thumbnails.get("medium");

                String videoId = id.get("videoId").toString();

                videos.add(new YouTubeVideoDTO(
                        videoId,
                        snippet.get("title").toString(),
                        snippet.get("channelTitle").toString(),
                        medium.get("url").toString(),
                        "https://www.youtube.com/watch?v=" + videoId
                ));
            }

            log.info("Fetched {} videos from YouTube", videos.size());
            try {
                videoSearchService.indexYouTubeResults(query, videos);
            } catch (Exception ex) {
                log.error("Failed to index YouTube results in Elasticsearch", ex);
            }

            return videos;

        } catch (Exception e) {
            log.error("YouTube search failed, falling back to Elasticsearch", e);
            try {
                List<com.cook2cart.video_service.search.VideoSearchDocument> docs = videoSearchService.searchHistory(query);
                if (docs != null && !docs.isEmpty()) {
                    log.info("Found {} cached videos in Elasticsearch for query: {}", docs.size(), query);
                    return docs.stream()
                            .map(doc -> new YouTubeVideoDTO(
                                    doc.getVideoId(),
                                    doc.getTitle(),
                                    doc.getChannelName(),
                                    doc.getThumbnailUrl(),
                                    "https://www.youtube.com/watch?v=" + doc.getVideoId()
                            ))
                            .toList();
                }
            } catch (Exception ex) {
                log.error("Elasticsearch fallback search failed", ex);
            }
            throw new RuntimeException("Failed to search YouTube videos");
        }
    }
}
