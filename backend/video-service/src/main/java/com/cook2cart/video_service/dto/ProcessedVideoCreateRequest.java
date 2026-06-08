package com.cook2cart.video_service.dto;

import com.cook2cart.video_service.entity.ProcessedVideoStatus;

public record ProcessedVideoCreateRequest(
        Long userId,
        Long videoId,
        String audioPath,
        String videoPath,
        String s3Url,
        ProcessedVideoStatus status
) {
}
