package com.simcop.model.embeddable;

import com.simcop.model.AmmoType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Embeddable
public class AmmoStock {
    @Enumerated(EnumType.STRING)
    private AmmoType type;
    private int quantity;

    public AmmoStock() {}

    public AmmoStock(AmmoType type, int quantity) {
        this.type = type;
        this.quantity = quantity;
    }

    public AmmoType getType() {
        return type;
    }

    public void setType(AmmoType type) {
        this.type = type;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
