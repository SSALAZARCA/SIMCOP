package com.sigep.dto;

import lombok.Data;
import java.util.List;
import com.sigep.model.Soldier;

@Data
public class TransferViabilityResult {
    private boolean viable;
    private boolean blockedByToe;
    private boolean blockedByOperationalStatus;
    private String message;
    private List<Soldier> suggestedReplacements;
}
