package com.cook2cart.video_service.dto;


import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class YouTubeVideoDTO {
    private String videoId;
    private String title;
    private String channelTitle;
    private String thumbnailUrl;
    private String videoUrl;

    public YouTubeVideoDTO(String videoId, String title, String channelTitle, String thumbnailUrl, String videoUrl) {
        this.videoId = videoId;
        this.title = title;
        this.channelTitle = channelTitle;
        this.thumbnailUrl = thumbnailUrl;
        this.videoUrl = videoUrl;
    }
}
