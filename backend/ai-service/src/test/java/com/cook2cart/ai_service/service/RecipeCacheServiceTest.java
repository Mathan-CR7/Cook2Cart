package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.RecipeResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.mockito.Spy;
import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeCacheServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private RecipeCacheService recipeCacheService;

    private RecipeResponse recipeResponse;

    @BeforeEach
    void setUp() {
        recipeResponse = new RecipeResponse();
        recipeResponse.setLanguageDetected("en");
        recipeResponse.setEnglishTranscript("Boil water");
    }

    @Test
    void getRecipe_CacheHit() {
        String videoId = "yt123";
        String key = "recipe:video:yt123";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(key)).thenReturn(recipeResponse);

        Optional<RecipeResponse> result = recipeCacheService.getRecipe(videoId);

        assertTrue(result.isPresent());
        assertEquals("en", result.get().getLanguageDetected());
        verify(valueOperations, times(1)).get(key);
    }

    @Test
    void getRecipe_CacheMiss() {
        String videoId = "yt123";
        String key = "recipe:video:yt123";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(key)).thenReturn(null);

        Optional<RecipeResponse> result = recipeCacheService.getRecipe(videoId);

        assertFalse(result.isPresent());
        verify(valueOperations, times(1)).get(key);
    }

    @Test
    void getRecipe_InvalidVideoId_ReturnsEmpty() {
        Optional<RecipeResponse> result = recipeCacheService.getRecipe(null);
        assertFalse(result.isPresent());
        verifyNoInteractions(redisTemplate);
    }

    @Test
    void cacheRecipe_Success() {
        String videoId = "yt123";
        String key = "recipe:video:yt123";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        recipeCacheService.cacheRecipe(videoId, recipeResponse);

        verify(valueOperations, times(1)).set(key, recipeResponse, Duration.ofHours(24));
    }

    @Test
    void cacheRecipe_InvalidInput_DoesNothing() {
        recipeCacheService.cacheRecipe(null, recipeResponse);
        recipeCacheService.cacheRecipe("yt123", null);
        verifyNoInteractions(redisTemplate);
    }
}
