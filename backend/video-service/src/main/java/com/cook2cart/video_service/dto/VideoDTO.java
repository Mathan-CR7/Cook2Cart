package com.cook2cart.video_service.dto;

import java.time.LocalDateTime;

public record VideoDTO(
        Long id,
        String youtubeVideoId,
        String title,
        String channelName,
        String thumbnailUrl,
        String videoUrl,
        String duration,
        LocalDateTime searchedAt
) {
}
