package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class UpdateUserSchema {
    public static void main(String[] args) {
        String url = "jdbc:mysql://srv1196.hstgr.io:3306/u689528678_SIMCOP";
        String user = "u689528678_SIMCOP";
        String password = "Ssc841209*";

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
