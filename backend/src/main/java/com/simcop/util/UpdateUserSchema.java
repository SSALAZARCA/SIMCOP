package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class UpdateUserSchema {
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

            System.out.println("Altering 'users' table schema...");
            // Drop primary key constraint if necessary or just modify column
            // Since it's likely auto-increment, we might need to drop that first
            try {
                stmt.executeUpdate("ALTER TABLE users MODIFY id VARCHAR(36)");
            } catch (Exception e) {
                System.out.println("Direct modify failed, trying to drop auto_increment first...");
                stmt.executeUpdate("ALTER TABLE users MODIFY id BIGINT NOT NULL");
                stmt.executeUpdate("ALTER TABLE users DROP PRIMARY KEY");
                stmt.executeUpdate("ALTER TABLE users MODIFY id VARCHAR(36) NOT NULL PRIMARY KEY");
            }

            System.out.println("Schema updated successfully.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
