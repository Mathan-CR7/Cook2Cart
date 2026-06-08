package com.cook2cart.video_service.repository;

import com.cook2cart.video_service.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    Optional<Video> findByYoutubeVideoId(String youtubeVideoId);
}
