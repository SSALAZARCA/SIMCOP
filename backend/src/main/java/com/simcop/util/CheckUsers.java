package com.simcop.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckUsers {
    public static void main(String[] args) {
        String url = "jdbc:mysql://srv1196.hstgr.io:3306/u689528678_SIMCOP";
        String user = "u689528678_SIMCOP";
        String password = "Ssc841209*";

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery("SELECT id, username, hashed_password FROM users")) {

            System.out.println("=== USERS IN DATABASE ===");
            boolean found = false;
            while (rs.next()) {
                found = true;
                System.out.println("ID: " + rs.getString("id"));
                System.out.println("Username: " + rs.getString("username"));
                System.out.println("Password: " + rs.getString("hashed_password"));
                System.out.println("-------------------------");
            }
            if (!found) {
                System.out.println("No users found in the database.");
            }
            System.out.println("=========================");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
