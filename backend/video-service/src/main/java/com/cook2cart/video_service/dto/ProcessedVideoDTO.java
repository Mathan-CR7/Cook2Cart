package com.cook2cart.video_service.dto;

import com.cook2cart.video_service.entity.ProcessedVideoStatus;

import java.time.LocalDateTime;

public record ProcessedVideoDTO(
        Long id,
        Long userId,
        Long videoId,
        String audioPath,
        String videoPath,
        String s3Url,
        ProcessedVideoStatus status,
        LocalDateTime processedAt
) {
}
