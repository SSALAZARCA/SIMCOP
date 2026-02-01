package com.simcop.model.embeddable;

import jakarta.persistence.Embeddable;

@Embeddable
public class CommanderInfo {
    private String rank;
    private String name;

    public CommanderInfo() {}

    public CommanderInfo(String rank, String name) {
        this.rank = rank;
        this.name = name;
    }

    public String getRank() {
        return rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
