import java.sql.*;
public class Check {
    public static void main(String[] args) throws Exception {
        Connection c = DriverManager.getConnection("jdbc:h2:file:./backend/data/simcop", "sa", "");
        ResultSet rs = c.createStatement().executeQuery("SELECT * FROM fire_mission");
        while(rs.next()) {
            System.out.println(rs.getString("id") + " | " + rs.getString("status") + " | " + rs.getString("assigned_artillery_id"));
        }
    }
}
