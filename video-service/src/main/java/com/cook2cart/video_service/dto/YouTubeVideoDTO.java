package com.cook2cart.video_service.dto;


import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class YouTubeVideoDTO {
    private String videoId;
    private String title;
    private String channelTitle;
    private String thumbnailUrl;
    private String videoUrl;
}