package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DropUserTable {
    public static void main(String[] args) {
        String host = System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "srv1196.hstgr.io";
        String dbName = System.getenv("DB_NAME") != null ? System.getenv("DB_NAME") : "u689528678_SIMCOP";
        String url = "jdbc:mysql://" + host + ":3306/" + dbName;
        String user = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "u689528678_SIMCOP";
        String password = System.getenv("DB_PASSWORD");

        if (password == null) {
            System.err.println("Error: DB_PASSWORD environment variable must be set.");
            System.exit(1);
        }

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement()) {

            System.out.println("Dropping 'users' table...");
            stmt.executeUpdate("DROP TABLE IF EXISTS users");
            System.out.println("Table dropped successfully.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
