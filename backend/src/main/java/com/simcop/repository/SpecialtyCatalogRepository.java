package com.simcop.repository;

import com.simcop.model.SpecialtyCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository para el catálogo de especialidades militares
 */
@Repository
public interface SpecialtyCatalogRepository extends JpaRepository<SpecialtyCatalog, String> {

    /**
     * Buscar especialidades por categoría
     * 
     * @param category Categoría (officers, ncos, professionalSoldiers,
     *                 regularSoldiers, civilians)
     * @return Lista de especialidades de la categoría
     */
    List<SpecialtyCatalog> findByCategory(String category);

    /**
     * Buscar especialidad por código MOS
     * 
     * @param code Código MOS
     * @return Especialidad si existe
     */
    Optional<SpecialtyCatalog> findByCode(String code);
}
