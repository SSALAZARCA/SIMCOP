import sys

try:
    import mysql.connector
    
    # Connection parameters
    config = {
        'host': '193.203.175.58',
        'port': 3306,
        'user': 'u689528678_SIMCOP',
        'password': 'Ssc841209*',
        'database': 'u689528678_SIMCOP'
    }
    
    print("Connecting to MySQL...")
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    
    # Drop table if exists
    print("Dropping existing table if any...")
    cursor.execute("DROP TABLE IF EXISTS specialty_catalog")
    
    # Create table
    print("Creating specialty_catalog table...")
    create_table_sql = """
    CREATE TABLE specialty_catalog (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description VARCHAR(500)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
    cursor.execute(create_table_sql)
    
    # Insert sample data
    print("Inserting sample data...")
    insert_sql = """
    INSERT INTO specialty_catalog (id, code, name, category, description) VALUES
    (UUID(), '11B', 'Infantería', 'professionalSoldiers', 'Especialidad de infantería básica'),
    (UUID(), '19D', 'Caballería Blindada', 'professionalSoldiers', 'Operador de vehículos blindados'),
    (UUID(), '31B', 'Policía Militar', 'professionalSoldiers', 'Policía militar y seguridad')
    """
    cursor.execute(insert_sql)
    
    conn.commit()
    print("✓ Table created successfully!")
    print("✓ Sample data inserted!")
    
    cursor.close()
    conn.close()
    
except ImportError:
    print("ERROR: mysql-connector-python not installed")
    print("Installing mysql-connector-python...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mysql-connector-python"])
    print("Please run this script again")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
