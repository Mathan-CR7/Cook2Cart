package com.cook2cart.video_service.dto;

import lombok.Data;

@Data
public class VideoRequestDTO {
    private String url;
    private Long userId;
    private Long videoId;
}
