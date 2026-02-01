package com.simcop.controller;

import com.simcop.dto.BMARecommendationDTO;
import com.simcop.dto.LogisticsPredictionDTO;
import com.simcop.dto.HotspotDTO;
import com.simcop.service.BMAService;
import com.simcop.service.DoctrinalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bma")
@CrossOrigin(origins = "http://localhost:3000")
public class BMAController {

    @Autowired
    private BMAService bmaService;

    @Autowired
    private DoctrinalService doctrinalService;

    @GetMapping("/recommendations/{threatId}")
    public List<BMARecommendationDTO> getRecommendations(@PathVariable String threatId) {
        return bmaService.recommendResponse(threatId);
    }

    @GetMapping("/logistics")
    public List<LogisticsPredictionDTO> getLogisticsPredictions() {
        return bmaService.predictLogistics();
    }

    @GetMapping("/hotspots")
    public List<HotspotDTO> getHotspots() {
        return bmaService.identifyHotspots();
    }

    @GetMapping("/hotspots/historical")
    public List<HotspotDTO> getHistoricalHotspots(@RequestParam(defaultValue = "48") int hours) {
        long since = System.currentTimeMillis() - (hours * 60 * 60 * 1000L);
        return bmaService.identifyHotspotsForPeriod(since);
    }

    @GetMapping("/doctrine/checklist")
    public List<String> getChecklist(@RequestParam String missionType) {
        return doctrinalService.getChecklistForMission(missionType);
    }

    @PostMapping("/logistics/request/{unitId}")
    public void requestResupply(@PathVariable String unitId) {
        bmaService.requestResupply(unitId);
    }
}
