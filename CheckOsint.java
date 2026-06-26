import java.sql.*;

public class CheckOsint {
    public static void main(String[] args) throws Exception {
        Connection c = DriverManager.getConnection("jdbc:h2:file:./backend/data/simcop", "sa", "");
        ResultSet rs = c.createStatement().executeQuery("SELECT * FROM osint_events");
        while(rs.next()) {
            System.out.println(rs.getString("title") + " | " + rs.getDouble("location_lat") + " | " + rs.getDouble("location_lon") + " | URL: " + rs.getString("source_url"));
        }
        c.close();
    }
}
