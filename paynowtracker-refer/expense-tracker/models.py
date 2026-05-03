from pydantic import BaseModel

class Expense(BaseModel):
    date: str
    amount: float
    merchant: str
