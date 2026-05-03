import sqlite3

def remove_duplicates():
    conn = sqlite3.connect("expenses.db")
    c = conn.cursor()

    # Step 1: Create a temporary table without duplicates
    c.execute('''
        CREATE TABLE IF NOT EXISTS temp_expenses AS
        SELECT MIN(id) as id, date, amount, merchant
        FROM expenses
        GROUP BY date, amount, merchant
    ''')

    # Step 2: Drop the original table
    c.execute('DROP TABLE expenses')

    # Step 3: Recreate the original table with UNIQUE constraint
    c.execute('''
        CREATE TABLE expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            merchant TEXT NOT NULL,
            UNIQUE(date, amount, merchant)
        )
    ''')

    # Step 4: Insert back the unique records
    c.execute('''
        INSERT INTO expenses (id, date, amount, merchant)
        SELECT id, date, amount, merchant FROM temp_expenses
    ''')

    # Step 5: Drop the temp table
    c.execute('DROP TABLE temp_expenses')

    conn.commit()
    conn.close()
    print("✅ Cleaned duplicate records.")

if __name__ == "__main__":
    remove_duplicates()
