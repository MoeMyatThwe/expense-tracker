from sqlite3 import Connection

def get_all_expenses(conn: Connection):
    c = conn.cursor()
    c.execute("SELECT * FROM expenses ORDER BY date DESC")
    return c.fetchall()

def insert_expense(conn: Connection, date: str, amount: float, merchant: str):
    c = conn.cursor()
    c.execute(
        "INSERT OR IGNORE INTO expenses (date, amount, merchant) VALUES (?, ?, ?)",
        (date, amount, merchant)
    )
    conn.commit()
