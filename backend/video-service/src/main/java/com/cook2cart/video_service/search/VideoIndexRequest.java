package com.cook2cart.video_service.search;

public record VideoIndexRequest(
        String videoId,
        String title,
        String channelName,
        String thumbnailUrl,
        String searchKeyword
) {
}
