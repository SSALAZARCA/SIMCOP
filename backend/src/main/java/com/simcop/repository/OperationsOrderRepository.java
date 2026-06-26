package com.simcop.repository;

import com.simcop.model.OperationsOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OperationsOrderRepository extends JpaRepository<OperationsOrder, String> {
}
