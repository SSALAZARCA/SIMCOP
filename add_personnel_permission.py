import mysql.connector
import json

# Conectar a la base de datos
try:
    connection = mysql.connector.connect(
        host='srv1196.hstgr.io',
        user='u689528678_SIMCOP',
        password='Ssc841209*',
        database='u689528678_SIMCOP'
    )
    
    cursor = connection.cursor()
    
    # Obtener permisos actuales del usuario
    cursor.execute("SELECT permissions FROM users WHERE username = 'santiago.salazar'")
    result = cursor.fetchone()
    
    if result:
        current_permissions = json.loads(result[0]) if result[0] else []
        print(f"Permisos actuales: {current_permissions}")
        
        # Agregar PERSONNEL si no existe
        if 'PERSONNEL' not in current_permissions:
            current_permissions.append('PERSONNEL')
            new_permissions_json = json.dumps(current_permissions)
            
            # Actualizar permisos
            cursor.execute(
                "UPDATE users SET permissions = %s WHERE username = 'santiago.salazar'",
                (new_permissions_json,)
            )
            connection.commit()
            print(f"✅ Permiso PERSONNEL agregado exitosamente")
            print(f"Nuevos permisos: {current_permissions}")
        else:
            print("ℹ️ El usuario ya tiene el permiso PERSONNEL")
    else:
        print("❌ Usuario 'santiago.salazar' no encontrado")
    
    # Verificar resultado final
    cursor.execute("SELECT username, role, permissions FROM users WHERE username = 'santiago.salazar'")
    final_result = cursor.fetchone()
    if final_result:
        print(f"\n--- Estado Final ---")
        print(f"Usuario: {final_result[0]}")
        print(f"Rol: {final_result[1]}")
        print(f"Permisos: {json.loads(final_result[2])}")
    
    cursor.close()
    connection.close()
    
except mysql.connector.Error as error:
    print(f"❌ Error al conectar a MySQL: {error}")
except Exception as e:
    print(f"❌ Error: {e}")
