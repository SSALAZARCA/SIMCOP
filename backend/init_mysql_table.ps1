# MySQL connection parameters
$server = "srv1196.hstgr.io"
$port = 3306
$database = "u689528678_SIMCOP"
$user = "u689528678_SIMCOP"
$password = "Ssc841209*"

# SQL commands
$sql = @"
DROP TABLE IF EXISTS specialty_catalog;

CREATE TABLE specialty_catalog (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO specialty_catalog (id, code, name, category, description) VALUES
(UUID(), '11B', 'Infantería', 'professionalSoldiers', 'Especialidad de infantería básica'),
(UUID(), '19D', 'Caballería Blindada', 'professionalSoldiers', 'Operador de vehículos blindados'),
(UUID(), '31B', 'Policía Militar', 'professionalSoldiers', 'Policía militar y seguridad');
"@

try {
    # Load MySQL .NET Connector if available
    [System.Reflection.Assembly]::LoadWithPartialName("MySql.Data") | Out-Null
    
    $connectionString = "Server=$server;Port=$port;Database=$database;Uid=$user;Pwd=$password;SslMode=None;AllowPublicKeyRetrieval=True"
    $connection = New-Object MySql.Data.MySqlClient.MySqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery() | Out-Null
    
    Write-Host "✓ Table 'specialty_catalog' created successfully!" -ForegroundColor Green
    Write-Host "✓ Sample data inserted!" -ForegroundColor Green
    
    $connection.Close()
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    Write-Host "MySQL .NET Connector might not be installed. Trying alternative method..." -ForegroundColor Yellow
}
