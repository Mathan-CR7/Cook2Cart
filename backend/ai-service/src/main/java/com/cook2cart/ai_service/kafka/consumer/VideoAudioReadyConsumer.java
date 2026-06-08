package com.cook2cart.ai_service.kafka.consumer;

import com.cook2cart.ai_service.dto.Ingredient;
import com.cook2cart.ai_service.dto.RecipeCreateRequest;
import com.cook2cart.ai_service.dto.RecipeIngredientRequest;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.entity.AiRecipeResponse;
import com.cook2cart.ai_service.kafka.event.VideoAudioReadyEvent;
import com.cook2cart.ai_service.kafka.support.PathMultipartFile;
import com.cook2cart.ai_service.repository.RecipeResponseRepository;
import com.cook2cart.ai_service.service.RecipeCatalogService;
import com.cook2cart.ai_service.service.RecipeCacheService;
import com.cook2cart.ai_service.service.RecipeService;
import com.cook2cart.ai_service.util.YouTubeVideoIdExtractor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoAudioReadyConsumer {

    private final RecipeService recipeService;
    private final RecipeCatalogService recipeCatalogService;
    private final RecipeCacheService recipeCacheService;
    private final RecipeResponseRepository recipeResponseRepository;
    private final ObjectMapper objectMapper;

    @Value("${cook2cart.audio.docker-path-prefix:/tmp/cook2cart}")
    private String dockerAudioPathPrefix;

    @Value("${cook2cart.audio.host-path-prefix:../../data}")
    private String hostAudioPathPrefix;

    @KafkaListener(
            topics = "${cook2cart.kafka.topics.video-audio-ready}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void consume(VideoAudioReadyEvent event) {
        log.info("Received AUDIO_READY event: {}", event);

        String cacheVideoId = resolveCacheVideoId(event);
        if (cacheVideoId != null) {
            if (recipeCacheService.getRecipe(cacheVideoId).isPresent()) {
                return;
            }
        } else {
            log.warn("Recipe cache skipped because no YouTube video id was available. Event: {}", event);
        }

        if (event.getAudioPath() == null || event.getAudioPath().isBlank()) {
            log.warn("Skipping AUDIO_READY event because audioPath is empty. Event: {}", event);
            return;
        }

        Path audioPath = resolveAudioPath(event.getAudioPath());
        if (!Files.exists(audioPath)) {
            log.error("Audio file not found for AUDIO_READY event. audioPath={}, event={}", audioPath, event);
            return;
        }

        try {
            PathMultipartFile audioFile = new PathMultipartFile(audioPath, "audio/mpeg");
            RecipeResponse response = recipeService.processRecipeAudio(audioFile);

            if (response == null) {
                log.warn("AI processing returned null for event: {}", event);
                return;
            }

            AiRecipeResponse audit = recipeResponseRepository.save(toAuditEntity(response));
            response.setId(audit.getId());

            var savedRecipe = recipeCatalogService.createRecipe(toRecipeCreateRequest(event, response));
            response.setId(savedRecipe.id());
            recipeCacheService.cacheRecipe(cacheVideoId, response);

            log.info("AUDIO_READY event processed successfully for videoId={}, audioPath={}", event.getVideoId(), event.getAudioPath());
        } catch (Exception ex) {
            log.error("Failed to process AUDIO_READY event: {}", event, ex);
        }
    }

    private String resolveCacheVideoId(VideoAudioReadyEvent event) {
        return YouTubeVideoIdExtractor.extract(event.getVideoUrl())
                .orElseGet(() -> event.getVideoId() == null ? null : String.valueOf(event.getVideoId()));
    }

    private Path resolveAudioPath(String eventAudioPath) {
        String normalizedEventPath = eventAudioPath.replace('\\', '/');
        String normalizedDockerPrefix = dockerAudioPathPrefix.replace('\\', '/');

        if (normalizedEventPath.startsWith(normalizedDockerPrefix)) {
            String relativePath = normalizedEventPath.substring(normalizedDockerPrefix.length());
            if (relativePath.startsWith("/")) {
                relativePath = relativePath.substring(1);
            }
            return Path.of(hostAudioPathPrefix, relativePath).toAbsolutePath().normalize();
        }

        return Path.of(eventAudioPath).toAbsolutePath().normalize();
    }

    private RecipeCreateRequest toRecipeCreateRequest(VideoAudioReadyEvent event, RecipeResponse response) {
        List<RecipeIngredientRequest> ingredients = response.getIngredients() == null
                ? List.of()
                : response.getIngredients().stream()
                .map(this::toIngredientRequest)
                .toList();

        return new RecipeCreateRequest(
                event.getUserId(),
                event.getVideoId(),
                buildRecipeName(event),
                null,
                null,
                ingredients,
                response.getInstructions()
        );
    }

    private RecipeIngredientRequest toIngredientRequest(Ingredient ingredient) {
        return new RecipeIngredientRequest(
                ingredient.getName(),
                ingredient.getRecipeQuantity(),
                ingredient.getRecipeUnit(),
                ingredient.getQuantity(),
                ingredient.getUnit(),
                ingredient.isEstimated(),
                ingredient.getSource(),
                ingredient.getConfidence()
        );
    }

    private String buildRecipeName(VideoAudioReadyEvent event) {
        return event.getVideoId() == null
                ? "Recipe from audio"
                : "Recipe from video " + event.getVideoId();
    }

    private AiRecipeResponse toAuditEntity(RecipeResponse response) {
        Double confidenceScore = resolveConfidenceScore(response);
        response.setConfidenceScore(confidenceScore);

        return AiRecipeResponse.builder()
                .englishTranscript(response.getEnglishTranscript())
                .rawAiResponse(toJson(response))
                .languageDetected(response.getLanguageDetected())
                .confidenceScore(confidenceScore)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private Double resolveConfidenceScore(RecipeResponse response) {
        if (response.getConfidenceScore() != null) {
            return response.getConfidenceScore();
        }

        if (response.getIngredients() == null || response.getIngredients().isEmpty()) {
            return 0.0;
        }

        double averageConfidence = response.getIngredients().stream()
                .mapToDouble(Ingredient::getConfidence)
                .filter(score -> score > 0.0)
                .average()
                .orElse(0.0);

        return Math.round(averageConfidence * 100.0) / 100.0;
    }

    private String toJson(RecipeResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize AI recipe response for audit storage", e);
            return null;
        }
    }
}
