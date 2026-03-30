package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CreateSpecialtyTable {
    public static void main(String[] args) {
        String host = System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "srv1196.hstgr.io";
        String dbName = System.getenv("DB_NAME") != null ? System.getenv("DB_NAME") : "u689528678_SIMCOP";
        String url = "jdbc:mysql://" + host + ":3306/" + dbName + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String user = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "u689528678_SIMCOP";
        String password = System.getenv("DB_PASSWORD");

        if (password == null) {
            System.err.println("Error: DB_PASSWORD environment variable must be set.");
            System.exit(1);
        }

        String sql = "CREATE TABLE IF NOT EXISTS specialty_catalog (" +
                "id VARCHAR(255) PRIMARY KEY, " +
                "code VARCHAR(50) UNIQUE NOT NULL, " +
                "name VARCHAR(255) NOT NULL, " +
                "category VARCHAR(50) NOT NULL, " +
                "description VARCHAR(500)" +
                ")";

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement()) {

            stmt.executeUpdate(sql);
            System.out.println("Table 'specialty_catalog' created successfully!");

        } catch (Exception e) {
            System.err.println("Error creating table: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
