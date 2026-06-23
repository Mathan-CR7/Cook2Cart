package com.cook2cart.video_service.service;

import com.cook2cart.video_service.dto.*;
import com.cook2cart.video_service.entity.*;
import com.cook2cart.video_service.repository.ProcessedVideoRepository;
import com.cook2cart.video_service.repository.UserVideoActionRepository;
import com.cook2cart.video_service.repository.VideoRepository;
import com.cook2cart.video_service.search.VideoSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoCatalogServiceTest {

    @Mock
    private VideoRepository videoRepository;

    @Mock
    private ProcessedVideoRepository processedVideoRepository;

    @Mock
    private UserVideoActionRepository userVideoActionRepository;

    @Mock
    private VideoSearchService videoSearchService;

    @InjectMocks
    private VideoCatalogService videoCatalogService;

    private Video video;
    private ProcessedVideo processedVideo;
    private UserVideoAction userVideoAction;

    @BeforeEach
    void setUp() {
        video = new Video();
        video.setId(10L);
        video.setYoutubeVideoId("yt_12345678");
        video.setTitle("Best Biryani");
        video.setChannelName("Cook2Cart");
        video.setThumbnailUrl("thumb_url");
        video.setVideoUrl("video_url");
        video.setDuration("10:00");
        video.setSearchedAt(LocalDateTime.now());

        processedVideo = ProcessedVideo.builder()
                .id(20L)
                .userId(1L)
                .video(video)
                .audioPath("audio_path")
                .videoPath("video_path")
                .s3Url("s3_url")
                .status(ProcessedVideoStatus.COMPLETED)
                .processedAt(LocalDateTime.now())
                .build();

        userVideoAction = UserVideoAction.builder()
                .id(30L)
                .userId(1L)
                .video(video)
                .actionType(UserVideoActionType.SAVED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void saveVideo_Success() {
        VideoCreateRequest request = new VideoCreateRequest("yt_12345678", "Best Biryani", "Cook2Cart", "thumb_url", "video_url", "10:00");
        when(videoRepository.findByYoutubeVideoId("yt_12345678")).thenReturn(Optional.of(video));
        when(videoRepository.save(any(Video.class))).thenReturn(video);

        VideoDTO result = videoCatalogService.saveVideo(request);

        assertNotNull(result);
        assertEquals(10L, result.id());
        assertEquals("yt_12345678", result.youtubeVideoId());
        assertEquals("Best Biryani", result.title());
        verify(videoRepository, times(1)).findByYoutubeVideoId("yt_12345678");
        verify(videoRepository, times(1)).save(any(Video.class));
    }

    @Test
    void getVideos_Success() {
        when(videoRepository.findAll()).thenReturn(Arrays.asList(video));

        List<VideoDTO> results = videoCatalogService.getVideos();

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(10L, results.get(0).id());
        verify(videoRepository, times(1)).findAll();
    }

    @Test
    void saveProcessedVideo_Success() {
        ProcessedVideoCreateRequest request = new ProcessedVideoCreateRequest(1L, 10L, "audio_path", "video_path", "s3_url", ProcessedVideoStatus.COMPLETED);
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video));
        when(processedVideoRepository.save(any(ProcessedVideo.class))).thenReturn(processedVideo);

        ProcessedVideoDTO result = videoCatalogService.saveProcessedVideo(request);

        assertNotNull(result);
        assertEquals(20L, result.id());
        assertEquals(1L, result.userId());
        assertEquals(10L, result.videoId());
        verify(videoRepository, times(1)).findById(10L);
        verify(processedVideoRepository, times(1)).save(any(ProcessedVideo.class));
    }

    @Test
    void saveProcessedVideo_VideoNotFound_ThrowsException() {
        ProcessedVideoCreateRequest request = new ProcessedVideoCreateRequest(1L, 999L, "audio_path", "video_path", "s3_url", ProcessedVideoStatus.COMPLETED);
        when(videoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
            videoCatalogService.saveProcessedVideo(request)
        );

        verify(processedVideoRepository, never()).save(any(ProcessedVideo.class));
    }

    @Test
    void saveUserVideoAction_Success() {
        UserVideoActionRequest request = new UserVideoActionRequest(1L, 10L, UserVideoActionType.SAVED);
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video));
        when(userVideoActionRepository.findByUserIdAndVideoIdAndActionType(1L, 10L, UserVideoActionType.SAVED))
                .thenReturn(Optional.of(userVideoAction));
        when(userVideoActionRepository.save(any(UserVideoAction.class))).thenReturn(userVideoAction);

        UserVideoActionDTO result = videoCatalogService.saveUserVideoAction(request);

        assertNotNull(result);
        assertEquals(30L, result.id());
        assertEquals(1L, result.userId());
        assertEquals(UserVideoActionType.SAVED, result.actionType());
        verify(userVideoActionRepository, times(1)).save(any(UserVideoAction.class));
    }

    @Test
    void saveUserVideoAction_UserIdMissing_ThrowsException() {
        UserVideoActionRequest request = new UserVideoActionRequest(null, 10L, UserVideoActionType.SAVED);

        assertThrows(IllegalArgumentException.class, () ->
            videoCatalogService.saveUserVideoAction(request)
        );

        verify(userVideoActionRepository, never()).save(any(UserVideoAction.class));
    }

    @Test
    void getUserVideoActions_Success() {
        when(userVideoActionRepository.findByUserIdAndActionTypeOrderByCreatedAtDesc(1L, UserVideoActionType.SAVED))
                .thenReturn(Arrays.asList(userVideoAction));

        List<UserVideoActionDTO> results = videoCatalogService.getUserVideoActions(1L, UserVideoActionType.SAVED);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(30L, results.get(0).id());
        verify(userVideoActionRepository, times(1)).findByUserIdAndActionTypeOrderByCreatedAtDesc(1L, UserVideoActionType.SAVED);
    }

    @Test
    void deleteUserVideoAction_Success() {
        doNothing().when(userVideoActionRepository).deleteByUserIdAndVideoIdAndActionType(1L, 10L, UserVideoActionType.SAVED);

        videoCatalogService.deleteUserVideoAction(1L, 10L, UserVideoActionType.SAVED);

        verify(userVideoActionRepository, times(1)).deleteByUserIdAndVideoIdAndActionType(1L, 10L, UserVideoActionType.SAVED);
    }
}
