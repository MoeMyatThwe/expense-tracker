from __future__ import print_function
from db import create_connection, create_table
import datetime
import os.path
import base64
import re
from bs4 import BeautifulSoup
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def authenticate_gmail():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def extract_details_from_text(text):
    amount_match = re.search(r'SGD\s?([\d,.]+)', text)
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else None

    date_match = re.search(r'dated\s+([0-9]{1,2}\s+\w+)', text, re.IGNORECASE)
    date = date_match.group(1) if date_match else None

    merchant = None
    same_line = re.search(r'To:\s*(.+)', text)
    next_line = re.search(r'To:\s*\n\s*(.+)', text)
    fallback_line = re.search(r'(?:To|Merchant|Recipient)[^\n]*\n(.+)', text)

    if same_line:
        raw_merchant = same_line.group(1).strip()
        merchant = re.split(r"If unauthorised|To view transaction details", raw_merchant)[0].strip()

    elif next_line:
        merchant = next_line.group(1).strip()
    elif fallback_line:
        merchant = fallback_line.group(1).strip()
    else:
        merchant = "Unknown"

    return {
        "amount": amount,
        "date": date,
        "merchant": merchant
    }

def search_paynow_emails(service):
    query = 'transaction OR SGD OR Amount'
    results = service.users().messages().list(userId='me', q=query).execute()
    messages = results.get('messages', [])
    print(f"\n📨 History of your wasting money 👇")

    for msg in messages[:50]:  # increase limit as needed
        msg_data = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
        payload = msg_data.get('payload', {})
        internal_date = int(msg_data.get('internalDate'))
        email_datetime = datetime.datetime.fromtimestamp(internal_date / 1000)
        email_year = email_datetime.year

        parts = payload.get('parts', [])
        body_data = None
        mime_type = None

        for part in parts:
            if part.get('mimeType') == 'text/plain':
                body_data = part.get('body', {}).get('data')
                mime_type = 'plain'
                break
            elif part.get('mimeType') == 'text/html':
                body_data = part.get('body', {}).get('data')
                mime_type = 'html'

        if body_data:
            try:
                decoded_bytes = base64.urlsafe_b64decode(body_data.encode('ASCII'))
                decoded_body = decoded_bytes.decode('utf-8')

                if mime_type == 'html':
                    decoded_body = BeautifulSoup(decoded_body, 'html.parser').get_text()

                # ✅ Extract subject to combine with body
                subject = ''
                headers = msg_data.get('payload', {}).get('headers', [])
                for header in headers:
                    if header.get('name', '').lower() == 'subject':
                        subject = header.get('value', '')
                        break

                combined_text = (subject + ' ' + decoded_body).lower()

                # ✅ Check if both keywords exist in email (body or subject)
                if "transaction" not in combined_text or "sgd" not in combined_text or  "amount" not in combined_text:
                    continue

                # ❌ Skip non-expense emails
                if "received sgd" in combined_text or "you have received" in combined_text:
                    print("🔁 Skipped (incoming payment)")
                    continue
                if "consolidated statement" in combined_text or "e-statement" in combined_text or "view your statement" in combined_text:
                    print("🔁 Skipped (eStatement)")
                    continue

                details = extract_details_from_text(decoded_body)

                if details and details["amount"] and details["date"] and details["merchant"]:
                    full_date = f"{details['date']} {email_year}"
                    print(f"💸 {full_date} | SGD {details['amount']} | To: {details['merchant']}")
                    # Save to DB
                    conn = create_connection()
                    c = conn.cursor()
                    c.execute(
                        "INSERT INTO expenses (date, amount, merchant) VALUES (?, ?, ?)",
                        (full_date, details["amount"], details["merchant"])
                    )
                    conn.commit()
                    conn.close()
  
                else:
                    print("❌ Could not extract all required details.")
                    print("📬 Email Preview:\n", decoded_body[:500], "\n---\n")

            except Exception as e:
                print("⚠️ Decoding failed:", e)
        else:
            continue

if __name__ == '__main__':
    create_table()
    service = authenticate_gmail()
    search_paynow_emails(service)
