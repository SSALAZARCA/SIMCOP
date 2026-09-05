package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DropAllTables {
    public static void main(String[] args) {
        String url = "jdbc:mysql://srv1196.hstgr.io:3306/u689528678_SIMCOP";
        String user = "u689528678_SIMCOP";
        String password = "Ssc841209*";

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement()) {

            System.out.println("Dropping 'user_permissions' table (FK dependency)...");
            stmt.executeUpdate("DROP TABLE IF EXISTS user_permissions");

            System.out.println("Dropping 'users' table...");
            stmt.executeUpdate("DROP TABLE IF EXISTS users");

            System.out.println("All user tables dropped successfully.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
