package com.cook2cart.video_service.dto;

public record VideoCreateRequest(
        String youtubeVideoId,
        String title,
        String channelName,
        String thumbnailUrl,
        String videoUrl,
        String duration
) {
}
