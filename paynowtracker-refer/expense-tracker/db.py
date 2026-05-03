import sqlite3

def create_connection():
    return sqlite3.connect("expenses.db")

def create_table():
    conn = create_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            merchant TEXT NOT NULL,
            UNIQUE(date, amount, merchant)
        )
    ''')
    conn.commit()
    conn.close()
