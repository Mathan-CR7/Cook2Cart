package com.cook2cart.video_service.search;

import com.cook2cart.video_service.dto.YouTubeVideoDTO;
import com.cook2cart.video_service.entity.UserVideoAction;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class VideoSearchService {

    private static final Logger log = LoggerFactory.getLogger(VideoSearchService.class);

    private final ElasticsearchOperations elasticsearchOperations;

    public VideoSearchDocument indexVideo(VideoIndexRequest request) {
        VideoSearchDocument document = VideoSearchDocument.builder()
                .id(buildDocumentId(request.videoId(), request.searchKeyword()))
                .videoId(request.videoId())
                .title(request.title())
                .channelName(request.channelName())
                .thumbnailUrl(request.thumbnailUrl())
                .searchKeyword(normalizeKeyword(request.searchKeyword()))
                .searchedAt(LocalDateTime.now())
                .build();

        return elasticsearchOperations.save(document);
    }

    public void indexUserVideoAction(UserVideoAction action) {
        if (action == null || action.getVideo() == null) {
            return;
        }

        VideoSearchDocument document = VideoSearchDocument.builder()
                .id(buildActionDocumentId(action))
                .videoId(action.getVideo().getYoutubeVideoId())
                .userId(action.getUserId())
                .actionType(action.getActionType().name())
                .title(action.getVideo().getTitle())
                .channelName(action.getVideo().getChannelName())
                .thumbnailUrl(action.getVideo().getThumbnailUrl())
                .searchKeyword(action.getActionType().name().toLowerCase(Locale.ROOT))
                .searchedAt(action.getCreatedAt())
                .build();

        elasticsearchOperations.save(document);
    }

    public void indexYouTubeResults(String keyword, List<YouTubeVideoDTO> videos) {
        if (videos == null || videos.isEmpty()) {
            return;
        }

        List<VideoSearchDocument> documents = videos.stream()
                .filter(video -> video.getVideoId() != null && video.getTitle() != null)
                .map(video -> VideoSearchDocument.builder()
                        .id(buildDocumentId(video.getVideoId(), keyword))
                        .videoId(video.getVideoId())
                        .title(video.getTitle())
                        .channelName(video.getChannelTitle())
                        .thumbnailUrl(video.getThumbnailUrl())
                        .searchKeyword(normalizeKeyword(keyword))
                        .searchedAt(LocalDateTime.now())
                        .build())
                .toList();

        try {
            elasticsearchOperations.save(documents);
        } catch (Exception ex) {
            log.warn("Could not index YouTube search results in Elasticsearch: {}", ex.getMessage());
        }
    }

    public List<String> getSuggestions(String prefix) {
        String queryText = normalizeKeyword(prefix);
        if (queryText.isBlank()) {
            return List.of();
        }

        NativeQuery query = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> b
                        .should(s -> s.matchPhrasePrefix(m -> m.field("title").query(queryText).boost(3.0f)))
                        .should(s -> s.match(m -> m.field("title").query(queryText).fuzziness("AUTO").boost(1.5f)))
                        .should(s -> s.matchPhrasePrefix(m -> m.field("searchKeyword").query(queryText)))
                ))
                .withPageable(PageRequest.of(0, 10))
                .build();

        try {
            return elasticsearchOperations.search(query, VideoSearchDocument.class)
                    .stream()
                    .map(SearchHit::getContent)
                    .map(VideoSearchDocument::getTitle)
                    .filter(Objects::nonNull)
                    .distinct()
                    .limit(10)
                    .toList();
        } catch (Exception ex) {
            log.warn("Could not load video search suggestions from Elasticsearch: {}", ex.getMessage());
            return List.of();
        }
    }

    public List<VideoSearchDocument> searchHistory(String keyword) {
        String queryText = normalizeKeyword(keyword);

        NativeQuery query = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> b
                        .should(s -> s.match(m -> m.field("title").query(queryText).fuzziness("AUTO").boost(2.0f)))
                        .should(s -> s.match(m -> m.field("searchKeyword").query(queryText).fuzziness("AUTO")))
                        .should(s -> s.match(m -> m.field("channelName").query(queryText).fuzziness("AUTO")))
                ))
                .withPageable(PageRequest.of(0, 25))
                .build();

        try {
            return elasticsearchOperations.search(query, VideoSearchDocument.class)
                    .stream()
                    .map(SearchHit::getContent)
                    .toList();
        } catch (Exception ex) {
            log.warn("Could not search video history in Elasticsearch: {}", ex.getMessage());
            return List.of();
        }
    }

    public List<VideoSearchDocument> searchUserVideos(Long userId, String actionType, String keyword) {
        String queryText = normalizeKeyword(keyword);

        NativeQuery query = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> b
                        .must(m -> m.term(t -> t.field("userId").value(userId)))
                        .must(m -> m.term(t -> t.field("actionType").value(actionType)))
                        .should(s -> s.match(m -> m.field("title").query(queryText).fuzziness("AUTO").boost(2.0f)))
                        .should(s -> s.match(m -> m.field("channelName").query(queryText).fuzziness("AUTO")))
                        .minimumShouldMatch("1")
                ))
                .withPageable(PageRequest.of(0, 25))
                .build();

        try {
            return elasticsearchOperations.search(query, VideoSearchDocument.class)
                    .stream()
                    .map(SearchHit::getContent)
                    .toList();
        } catch (Exception ex) {
            log.warn("Could not search user videos in Elasticsearch: {}", ex.getMessage());
            return List.of();
        }
    }

    public void deleteById(String id) {
        elasticsearchOperations.delete(id, VideoSearchDocument.class);
    }

    private String buildDocumentId(String videoId, String keyword) {
        return videoId + "-" + normalizeKeyword(keyword).replaceAll("[^a-z0-9]+", "-");
    }

    private String buildActionDocumentId(UserVideoAction action) {
        return action.getActionType().name().toLowerCase(Locale.ROOT) + "-" + action.getUserId() + "-" + action.getVideo().getId();
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
    }
}
