package com.cook2cart.video_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "videos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String youtubeVideoId;

    @Column(nullable = false)
    private String title;

    private String channelName;

    private String thumbnailUrl;

    @Column(nullable = false, length = 1000)
    private String videoUrl;

    private String duration;

    private LocalDateTime searchedAt;

    @Builder.Default
    @OneToMany(mappedBy = "video", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProcessedVideo> processedVideos = new ArrayList<>();
}
