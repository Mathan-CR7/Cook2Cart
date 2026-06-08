package com.cook2cart.video_service.repository;

import com.cook2cart.video_service.entity.ProcessedVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProcessedVideoRepository extends JpaRepository<ProcessedVideo, Long> {
    List<ProcessedVideo> findByUserId(Long userId);
    List<ProcessedVideo> findByVideoId(Long videoId);
}
