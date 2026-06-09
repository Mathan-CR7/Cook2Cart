package com.cook2cart.video_service.service;

import com.cook2cart.video_service.dto.*;
import com.cook2cart.video_service.entity.*;
import com.cook2cart.video_service.repository.ProcessedVideoRepository;
import com.cook2cart.video_service.repository.UserVideoActionRepository;
import com.cook2cart.video_service.repository.VideoRepository;
import com.cook2cart.video_service.search.VideoSearchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VideoCatalogService {

    private static final Logger log = LoggerFactory.getLogger(VideoCatalogService.class);

    private final VideoRepository videoRepository;
    private final ProcessedVideoRepository processedVideoRepository;
    private final UserVideoActionRepository userVideoActionRepository;
    private final VideoSearchService videoSearchService;

    public VideoDTO saveVideo(VideoCreateRequest request) {
        Video video = videoRepository.findByYoutubeVideoId(request.youtubeVideoId()).orElseGet(Video::new);
        video.setYoutubeVideoId(request.youtubeVideoId());
        video.setTitle(request.title());
        video.setChannelName(request.channelName());
        video.setThumbnailUrl(request.thumbnailUrl());
        video.setVideoUrl(request.videoUrl());
        video.setDuration(request.duration());
        video.setSearchedAt(LocalDateTime.now());
        return toVideoDTO(videoRepository.save(video));
    }

    public List<VideoDTO> getVideos() {
        return videoRepository.findAll().stream().map(this::toVideoDTO).toList();
    }

    public ProcessedVideoDTO saveProcessedVideo(ProcessedVideoCreateRequest request) {
        Video video = videoRepository.findById(request.videoId())
                .orElseThrow(() -> new RuntimeException("Video not found"));

        ProcessedVideo processedVideo = ProcessedVideo.builder()
                .userId(request.userId())
                .video(video)
                .audioPath(request.audioPath())
                .videoPath(request.videoPath())
                .s3Url(request.s3Url())
                .status(request.status() == null ? ProcessedVideoStatus.COMPLETED : request.status())
                .processedAt(LocalDateTime.now())
                .build();

        return toProcessedVideoDTO(processedVideoRepository.save(processedVideo));
    }

    public List<ProcessedVideoDTO> getProcessedVideosByUser(Long userId) {
        return processedVideoRepository.findByUserId(userId).stream().map(this::toProcessedVideoDTO).toList();
    }

    public UserVideoActionDTO saveUserVideoAction(UserVideoActionRequest request) {
        if (request.userId() == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Video video = videoRepository.findById(request.videoId())
                .orElseThrow(() -> new RuntimeException("Video not found"));

        UserVideoAction action = userVideoActionRepository
                .findByUserIdAndVideoIdAndActionType(request.userId(), request.videoId(), request.actionType())
                .orElseGet(() -> userVideoActionRepository.save(UserVideoAction.builder()
                        .userId(request.userId())
                        .video(video)
                        .actionType(request.actionType())
                        .createdAt(LocalDateTime.now())
                        .build()));

        action.setCreatedAt(LocalDateTime.now());
        UserVideoAction savedAction = userVideoActionRepository.save(action);
        try {
            videoSearchService.indexUserVideoAction(savedAction);
        } catch (Exception ex) {
            log.warn("Could not index user video action in Elasticsearch", ex);
        }
        return toUserVideoActionDTO(savedAction);
    }

    @Transactional(readOnly = true)
    public List<UserVideoActionDTO> getUserVideoActions(Long userId, UserVideoActionType actionType) {
        return userVideoActionRepository.findByUserIdAndActionTypeOrderByCreatedAtDesc(userId, actionType)
                .stream()
                .map(this::toUserVideoActionDTO)
                .toList();
    }

    @Transactional
    public void deleteUserVideoAction(Long userId, Long videoId, UserVideoActionType actionType) {
        userVideoActionRepository.deleteByUserIdAndVideoIdAndActionType(userId, videoId, actionType);
    }

    private VideoDTO toVideoDTO(Video video) {
        return new VideoDTO(video.getId(), video.getYoutubeVideoId(), video.getTitle(), video.getChannelName(),
                video.getThumbnailUrl(), video.getVideoUrl(), video.getDuration(), video.getSearchedAt());
    }

    private ProcessedVideoDTO toProcessedVideoDTO(ProcessedVideo processedVideo) {
        return new ProcessedVideoDTO(processedVideo.getId(), processedVideo.getUserId(), processedVideo.getVideo().getId(),
                processedVideo.getAudioPath(), processedVideo.getVideoPath(), processedVideo.getS3Url(),
                processedVideo.getStatus(), processedVideo.getProcessedAt());
    }

    private UserVideoActionDTO toUserVideoActionDTO(UserVideoAction action) {
        return new UserVideoActionDTO(action.getId(), action.getUserId(), action.getActionType(), action.getCreatedAt(),
                toVideoDTO(action.getVideo()));
    }
}
