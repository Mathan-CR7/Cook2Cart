package com.cook2cart.ai_service.dto;

import java.util.List;

public class CombineSourcesRequest {
    private String speechTranscript;
    private String ocrText;
    private List<String> visionDetections;
    private Integer servings;

    public CombineSourcesRequest() {
    }

    public CombineSourcesRequest(String speechTranscript, String ocrText, List<String> visionDetections, Integer servings) {
        this.speechTranscript = speechTranscript;
        this.ocrText = ocrText;
        this.visionDetections = visionDetections;
        this.servings = servings;
    }

    public String getSpeechTranscript() {
        return speechTranscript;
    }

    public void setSpeechTranscript(String speechTranscript) {
        this.speechTranscript = speechTranscript;
    }

    public String getOcrText() {
        return ocrText;
    }

    public void setOcrText(String ocrText) {
        this.ocrText = ocrText;
    }

    public List<String> getVisionDetections() {
        return visionDetections;
    }

    public void setVisionDetections(List<String> visionDetections) {
        this.visionDetections = visionDetections;
    }

    public Integer getServings() {
        return servings;
    }

    public void setServings(Integer servings) {
        this.servings = servings;
    }
}
