package com.cook2cart.video_service.dto;

import com.cook2cart.video_service.entity.UserVideoActionType;

public record UserVideoActionRequest(
        Long userId,
        Long videoId,
        UserVideoActionType actionType
) {
}
