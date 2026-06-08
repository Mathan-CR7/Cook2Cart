package com.cook2cart.video_service.search;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDateTime;

@Document(indexName = "video_index")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoSearchDocument {

    @Id
    private String id;

    @Field(type = FieldType.Keyword)
    private String videoId;

    @Field(type = FieldType.Long)
    private Long userId;

    @Field(type = FieldType.Keyword)
    private String actionType;

    @Field(type = FieldType.Text)
    private String title;

    @Field(type = FieldType.Text)
    private String channelName;

    @Field(type = FieldType.Keyword, index = false)
    private String thumbnailUrl;

    @Field(type = FieldType.Text)
    private String searchKeyword;

    @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second_millis)
    private LocalDateTime searchedAt;
}
