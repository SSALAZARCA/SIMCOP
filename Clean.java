import java.sql.*;

public class Clean {
    public static void main(String[] args) throws Exception {
        Connection c = DriverManager.getConnection("jdbc:h2:file:./backend/data/simcop", "sa", "");
        Statement s = c.createStatement();
        int d = s.executeUpdate("DELETE FROM osint_events WHERE source_url LIKE '%ejemplo.com%' OR source_name IN ('Noticias Locales', 'Diario Regional', 'Alerta Nacional')");
        System.out.println("DELETED: " + d);
        c.close();
    }
}
