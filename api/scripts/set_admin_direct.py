import psycopg2
import sys

# Direct connection to NeonDB - correct database: Optimeal
DB_URL = "postgresql://neondb_owner:npg_QmgRcdnr8EB7@ep-sparkling-forest-a15qavh7-pooler.ap-southeast-1.aws.neon.tech/Optimeal?sslmode=require"

def main():
    email = "forhadhasan1007@gmail.com"
    if len(sys.argv) > 1:
        email = sys.argv[1]

    print("Connecting to NeonDB (Optimeal database)...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # List users
    cur.execute("SELECT id, email, name, role FROM users")
    users = cur.fetchall()
    print(f"\nFound {len(users)} users:")
    for u in users:
        print(f"  ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Role: {u[3]}")
    
    # Promote user
    cur.execute("UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER(%s) RETURNING id, email, role", (email,))
    updated = cur.fetchone()
    if updated:
        conn.commit()
        print(f"\nSUCCESS: Promoted {updated[1]} to {updated[2]}!")
    else:
        print(f"\nUser with email {email} not found.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
