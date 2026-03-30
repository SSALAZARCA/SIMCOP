package com.simcop.util;

import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class InitSpecialtyTable {
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
        String sqlFile = "init_specialty_catalog.sql";

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement();
                BufferedReader reader = new BufferedReader(new FileReader(sqlFile))) {

            StringBuilder sql = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                // Skip comments and empty lines
                if (line.isEmpty() || line.startsWith("--")) {
                    continue;
                }
                sql.append(line).append(" ");

                // Execute when we hit a semicolon
                if (line.endsWith(";")) {
                    String statement = sql.toString();
                    System.out
                            .println("Executing: " + statement.substring(0, Math.min(50, statement.length())) + "...");
                    stmt.execute(statement);
                    sql.setLength(0);
                }
            }

            System.out.println("✓ Table 'specialty_catalog' initialized successfully!");
            System.out.println("✓ Sample data inserted!");

        } catch (Exception e) {
            System.err.println("✗ Error initializing table: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
