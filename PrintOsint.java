import java.sql.*;

public class PrintOsint {
    public static void main(String[] args) throws Exception {
        Connection c = DriverManager.getConnection("jdbc:h2:file:./backend/data/simcop", "sa", "");
        ResultSet rs = c.createStatement().executeQuery("SELECT * FROM osint_events");
        int count = 0;
        while(rs.next()) {
            count++;
            System.out.println(rs.getString("title"));
            System.out.println("LAT: " + rs.getDouble("location_lat") + " | LON: " + rs.getDouble("location_lon"));
            System.out.println("URL: " + rs.getString("source_url"));
            System.out.println("-------------------------");
        }
        System.out.println("Total events: " + count);
        c.close();
    }
}
