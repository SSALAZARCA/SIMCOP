package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CreateSpecialtyTable {
    public static void main(String[] args) {
        String url = "jdbc:mysql://srv1196.hstgr.io:3306/u689528678_SIMCOP?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String user = "u689528678_SIMCOP";
        String password = "Ssc841209*";

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
