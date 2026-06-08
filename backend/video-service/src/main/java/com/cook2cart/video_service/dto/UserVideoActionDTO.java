package com.cook2cart.video_service.dto;

import com.cook2cart.video_service.entity.UserVideoActionType;

import java.time.LocalDateTime;

public record UserVideoActionDTO(
        Long id,
        Long userId,
        UserVideoActionType actionType,
        LocalDateTime createdAt,
        VideoDTO video
) {
}
