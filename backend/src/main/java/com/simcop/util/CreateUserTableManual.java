package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CreateUserTableManual {
    public static void main(String[] args) {
        String url = "jdbc:mysql://srv1196.hstgr.io:3306/u689528678_SIMCOP";
        String user = "u689528678_SIMCOP";
        String password = "Ssc841209*";

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement()) {

            System.out.println("Dropping 'users' table if exists...");
            stmt.executeUpdate("DROP TABLE IF EXISTS users");

            System.out.println("Creating 'users' table manually...");
            String sql = "CREATE TABLE users (" +
                    "id VARCHAR(36) NOT NULL, " +
                    "username VARCHAR(255), " +
                    "display_name VARCHAR(255), " +
                    "hashed_password VARCHAR(255), " +
                    "role VARCHAR(50), " +
                    "assigned_unit_id VARCHAR(255), " +
                    "PRIMARY KEY (id))";
            stmt.executeUpdate(sql);

            System.out.println("Creating 'user_permissions' table manually...");
            stmt.executeUpdate("DROP TABLE IF EXISTS user_permissions");
            String sqlPerms = "CREATE TABLE user_permissions (" +
                    "user_id VARCHAR(36) NOT NULL, " +
                    "permissions VARCHAR(255))";
            stmt.executeUpdate(sqlPerms);

            System.out.println("Tables created successfully.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
