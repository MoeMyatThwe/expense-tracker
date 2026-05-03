import json
import re
import sys
from datetime import datetime

try:
    from rapidocr_onnxruntime import RapidOCR
except Exception as exc:  # pragma: no cover - returned to Next.js as JSON
    print(
        json.dumps(
            {
                "success": False,
                "error": (
                    "Python OCR dependency is missing. Run: "
                    "python -m pip install --user rapidocr-onnxruntime pillow"
                ),
                "details": str(exc),
            }
        )
    )
    sys.exit(0)


CATEGORY_KEYWORDS = {
    "groceries": [
        "fairprice",
        "ntuc",
        "cold storage",
        "sheng siong",
        "market",
        "supermarket",
        "grocery",
        "groceries",
        "giant",
        "prime",
        "don don",
    ],
    "food": [
        "restaurant",
        "cafe",
        "coffee",
        "kopi",
        "food",
        "kitchen",
        "mcdonald",
        "kfc",
        "toast",
        "bakery",
        "tea",
        "sushi",
        "noodle",
    ],
    "transport": ["taxi", "grab", "gojek", "comfort", "smrt", "bus", "mrt"],
    "shopping": [
        "uniqlo",
        "zara",
        "h&m",
        "mall",
        "shopee",
        "lazada",
        "amazon",
        "store",
        "retail",
    ],
    "health": ["guardian", "watsons", "pharmacy", "clinic", "hospital", "medical"],
    "entertainment": ["cinema", "movie", "game", "ktv", "ticket"],
    "bills": ["bill", "electric", "water", "telco", "singtel", "starhub", "m1"],
}


def normalize_line(line):
    return re.sub(r"\s+", " ", line).strip()


def clean_amount(value):
    value = (
        value.replace(",", "")
        .replace("S$", "")
        .replace("$", "")
        .replace("*", "")
        .strip()
    )
    try:
        return round(float(value), 2)
    except ValueError:
        return None


AMOUNT_PATTERN = re.compile(
    r"(?:S\$|\$)?\s*([+-]?[0-9]+(?:[,.][0-9]{3})*(?:\.[0-9]{2})\*?|[+-]?[0-9]+\.[0-9]{2}\*?)"
)


def extract_total(lines):
    total_keywords = ["grand total", "total amount", "amount due", "net total", "total"]
    ignore_keywords = [
        "subtotal",
        "sub total",
        "total savings",
        "savings",
        "change",
        "cash",
        "tax",
        "gst",
        "visa",
        "mastercard",
        "items",
        "rate",
        "after gst",
    ]

    candidates = []
    for index, line in enumerate(lines):
        lower = line.lower()
        if any(keyword in lower for keyword in ignore_keywords):
            continue

        has_total_keyword = any(keyword in lower for keyword in total_keywords)
        matches = AMOUNT_PATTERN.findall(line)
        if has_total_keyword and not matches:
            lookahead = " ".join(lines[index + 1 : index + 3])
            matches = AMOUNT_PATTERN.findall(lookahead)

        if not matches:
            continue

        amount = clean_amount(matches[-1])
        if amount is None or amount <= 0:
            continue

        if has_total_keyword:
            keyword_score = 100
        elif index > 0 and lines[index - 1].strip().lower() in {"total", "grand total"}:
            keyword_score = 90
        else:
            keyword_score = 0

        candidates.append((keyword_score, index, amount))

    if not candidates:
        amounts = []
        for line in lines:
            lower = line.lower()
            if any(keyword in lower for keyword in ignore_keywords):
                continue
            for match in AMOUNT_PATTERN.findall(line):
                amount = clean_amount(match)
                if amount and amount > 0:
                    amounts.append(amount)
        return max(amounts) if amounts else None

    candidates.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    return candidates[0][2]


def extract_date(lines):
    patterns = [
        r"\b([0-3]?\d[/-][01]?\d[/-](?:20)?\d{2})\b",
        r"\b((?:20)?\d{2}[/-][01]?\d[/-][0-3]?\d)\b",
        r"\b([0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(?:20)?\d{2})\b",
    ]
    joined = "\n".join(lines)

    for pattern in patterns:
        match = re.search(pattern, joined, re.IGNORECASE)
        if not match:
            continue

        raw = match.group(1)
        for fmt in (
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%Y/%m/%d",
            "%Y-%m-%d",
            "%y/%m/%d",
            "%y-%m-%d",
            "%d %b %Y",
            "%d %B %Y",
            "%d %b %y",
            "%d %B %y",
        ):
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
            except ValueError:
                pass

    return datetime.now().strftime("%Y-%m-%d")


def extract_merchant(lines):
    noisy = ["receipt", "tax invoice", "invoice", "gst", "duplicate", "customer copy"]
    for line in lines[:8]:
        lower = line.lower()
        if len(line) >= 3 and not any(word in lower for word in noisy):
            if not re.search(r"^\d+([./-]\d+)*$", line):
                return line[:80]

    return "Receipt"


def detect_category(lines, merchant):
    text = f"{merchant} {' '.join(lines)}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return "shopping"


def normalize_title(value):
    value = re.sub(r"(?<=[A-Za-z])\.(?=[A-Za-z])", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" -:*$")
    return value[:80] if value else ""


def looks_like_item_title(line):
    lower = line.lower()
    noisy = [
        "uen",
        "gst",
        "tel",
        "blk",
        "woodlands",
        "fairprice",
        "co-operative",
        "terminal",
        "transaction",
        "trans.",
        "auth",
        "approved",
        "signature",
        "receipt",
        "cashier",
        "thank",
        "linkpoints",
        "rebates",
        "total",
        "visa",
        "date",
        "items",
        "savings",
        "rate",
        "after gst",
        "tax",
        "description",
        "ineligible",
        "subject to",
        "plastic bag",
    ]
    if any(word in lower for word in noisy):
        return False
    if re.fullmatch(r"[0-9\s:./#-]+", line):
        return False
    if re.search(r"\b\d+\s*(for|x|xs)\b", lower):
        return False
    return bool(re.search(r"[A-Za-z]", line))


def get_entry_from_ocr_item(item):
    if len(item) < 2 or not item[1]:
        return None

    text = normalize_line(str(item[1]))
    if not text:
        return None

    try:
        box = item[0]
        xs = [float(point[0]) for point in box]
        ys = [float(point[1]) for point in box]
        return {
            "text": text,
            "x": sum(xs) / len(xs),
            "y": sum(ys) / len(ys),
            "height": max(ys) - min(ys),
        }
    except Exception:
        return {"text": text, "x": 0.0, "y": 0.0, "height": 20.0}


def should_skip_item_amount(line):
    lower = line.lower()
    return (
        "unit" in lower
        or re.search(r"\bfor\b", lower) is not None
        or "gst" in lower
        or "tax" in lower
        or "savings" in lower
        or "*" in line
    )


def make_item(title, amount, fallback_category, amount_y=None):
    item = {
        "title": title.title(),
        "amount": amount,
        "category": fallback_category,
        "description": "Scanned receipt item",
    }
    if amount_y is not None:
        item["_amount_y"] = amount_y
    return item


def apply_discount_to_last_item(items, discount):
    if not items or discount >= 0:
        return False

    items[-1]["amount"] = round(max(0, items[-1]["amount"] + discount), 2)
    items[-1]["description"] = "Scanned receipt item with discount"
    return True


def dedupe_items(items):
    unique = []
    seen = set()
    for item in items:
        key = (item["title"].lower(), item["amount"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique


def public_items(items):
    return [
        {key: value for key, value in item.items() if not key.startswith("_")}
        for item in items
        if item.get("amount", 0) > 0
    ]


def collect_item_area_amounts(entries):
    sorted_entries = sorted(entries, key=lambda entry: (entry["y"], entry["x"]))
    stop_y = None
    for entry in sorted_entries:
        lower = entry["text"].lower()
        if any(keyword in lower for keyword in ["total", "visa", "terminal", "transaction date", "total savings"]):
            stop_y = entry["y"]
            break

    amounts = []
    for entry in sorted_entries:
        if stop_y is not None and entry["y"] >= stop_y:
            continue

        text = entry["text"]
        lower = text.lower()
        if any(keyword in lower for keyword in ["unit", "for", "gst", "tax", "savings"]):
            continue

        matches = AMOUNT_PATTERN.findall(text)
        if not matches:
            continue

        amount = clean_amount(matches[-1])
        if amount is None or amount == 0:
            continue

        amounts.append(
            {
                "amount": amount,
                "absAmount": abs(amount),
                "y": entry["y"],
                "text": text,
                "isExplicitDiscount": amount < 0 or "discount" in lower or "rebate" in lower or "promo" in lower,
                "isSmallFee": "*" in text or "plastic bag" in lower or "bag" in lower,
            }
        )

    return amounts


def reconcile_items_to_receipt_total(items, receipt_total, entries, fallback_category):
    if receipt_total is None or not items:
        return items

    item_sum = round(sum(item["amount"] for item in items), 2)
    overage = round(item_sum - receipt_total, 2)
    if overage <= 0.01:
        underage = round(receipt_total - item_sum, 2)
        if 0.01 < underage <= 0.5:
            items.append(
                {
                    "title": "GST / Fee",
                    "amount": underage,
                    "category": fallback_category,
                    "description": "Scanned receipt fee adjustment",
                }
            )
        return items

    raw_amounts = collect_item_area_amounts(entries)
    if not raw_amounts:
        return items

    fee_candidates = [
        amount for amount in raw_amounts if 0 < amount["absAmount"] <= 0.5
    ]
    discount_candidates = [
        amount
        for amount in raw_amounts
        if amount["absAmount"] > 0.5
        and amount["absAmount"] <= max(overage + 1.0, 1.0)
        and not any(abs(item["amount"] - amount["absAmount"]) < 0.01 for item in items)
    ]

    best = None
    for discount in discount_candidates:
        direct_error = abs(discount["absAmount"] - overage)
        if best is None or direct_error < best["error"]:
            best = {"discount": discount, "fee": None, "error": direct_error}

        for fee in fee_candidates:
            error = abs(discount["absAmount"] - fee["absAmount"] - overage)
            if best is None or error < best["error"]:
                best = {"discount": discount, "fee": fee, "error": error}

    if not best or best["error"] > 0.08:
        return items

    discount = best["discount"]
    candidates = [
        (index, item)
        for index, item in enumerate(items)
        if item.get("_amount_y") is not None and item["_amount_y"] < discount["y"]
    ]
    if candidates:
        target_index, _ = max(candidates, key=lambda candidate: candidate[1]["_amount_y"])
    else:
        target_index = max(range(len(items)), key=lambda index: items[index]["amount"])

    items[target_index]["amount"] = round(
        max(0, items[target_index]["amount"] - discount["absAmount"]),
        2,
    )
    items[target_index]["description"] = "Scanned receipt item with discount"

    fee = best["fee"]
    if fee:
        items.append(
            {
                "title": "GST / Fee",
                "amount": fee["absAmount"],
                "category": fallback_category,
                "description": "Scanned receipt fee adjustment",
                "_amount_y": fee["y"],
            }
        )

    return items


def extract_items_by_position(entries, fallback_category):
    if not entries:
        return []

    sorted_entries = sorted(entries, key=lambda entry: (entry["y"], entry["x"]))
    stop_y = None
    for entry in sorted_entries:
        lower = entry["text"].lower()
        if any(
            keyword in lower
            for keyword in ["total", "visa", "terminal", "transaction date", "total savings"]
        ):
            stop_y = entry["y"]
            break

    item_area = [
        entry for entry in sorted_entries if stop_y is None or entry["y"] < stop_y
    ]
    if not item_area:
        return []

    default_height = max(
        10.0,
        sum(max(entry["height"], 1.0) for entry in item_area) / len(item_area),
    )

    inline_items = []
    title_entries = []
    amount_entries = []

    for entry in item_area:
        text = entry["text"]
        lower = text.lower()
        if any(keyword in lower for keyword in ["uen", "gst", "tel", "blk", "woodlands"]):
            continue
        amounts = AMOUNT_PATTERN.findall(text)
        amount = clean_amount(amounts[-1]) if amounts else None

        if amount is not None and amount < 0:
            amount_entries.append({**entry, "amount": amount})
            continue

        if should_skip_item_amount(text):
            continue

        has_amount = bool(amounts)
        has_title = looks_like_item_title(text)

        if has_amount and has_title:
            amount = clean_amount(amounts[-1])
            title = normalize_title(AMOUNT_PATTERN.sub("", text))
            if amount and amount > 0 and title and looks_like_item_title(title):
                inline_items.append(make_item(title, amount, fallback_category, entry["y"]))
            continue

        if has_amount:
            amount = clean_amount(amounts[-1])
            if amount and amount > 0:
                amount_entries.append({**entry, "amount": amount})
            continue

        if has_title:
            title_entries.append({**entry, "title": normalize_title(text)})

    items = inline_items[:]
    title_entries.sort(key=lambda entry: entry["y"])
    amount_entries.sort(key=lambda entry: entry["y"])

    if amount_entries:
        first_amount_y = amount_entries[0]["y"]
        title_entries = [
            entry
            for entry in title_entries
            if entry["y"] >= first_amount_y - default_height * 2.5
        ]

    positive_amount_entries = [
        entry for entry in amount_entries if entry["amount"] > 0
    ]
    discount_entries = [
        entry for entry in amount_entries if entry["amount"] < 0
    ]
    applied_discount_indexes = set()
    amount_index = 0
    for title_entry in title_entries:
        title = title_entry["title"]
        if not title:
            continue

        while (
            amount_index < len(positive_amount_entries)
            and positive_amount_entries[amount_index]["y"] < title_entry["y"] - default_height
        ):
            amount_index += 1

        if amount_index >= len(positive_amount_entries):
            break

        amount_entry = positive_amount_entries[amount_index]
        if amount_entry["y"] - title_entry["y"] > default_height * 4:
            continue

        amount_index += 1
        items.append(
            make_item(
                title,
                amount_entry["amount"],
                fallback_category,
                amount_entry["y"],
            )
        )

        next_positive_y = (
            positive_amount_entries[amount_index]["y"]
            if amount_index < len(positive_amount_entries)
            else amount_entry["y"] + default_height * 4
        )
        for discount_index, discount_entry in enumerate(discount_entries):
            if discount_index in applied_discount_indexes:
                continue
            if amount_entry["y"] < discount_entry["y"] < next_positive_y:
                apply_discount_to_last_item(items, discount_entry["amount"])
                applied_discount_indexes.add(discount_index)

    return dedupe_items(items)


def extract_items(lines, fallback_category):
    stop_keywords = ["total", "visa", "terminal", "transaction date", "total savings"]
    skip_keywords = ["gst", "tax", "savings", "subtotal", "change", "cash"]
    items = []
    pending_title = ""

    for line in lines:
        lower = line.lower()
        if any(keyword in lower for keyword in stop_keywords):
            break
        amounts = AMOUNT_PATTERN.findall(line)
        amount = clean_amount(amounts[-1]) if amounts else None

        if amount is not None and amount < 0:
            apply_discount_to_last_item(items, amount)
            pending_title = ""
            continue

        if any(keyword in lower for keyword in skip_keywords):
            continue
        if "unit" in lower:
            continue

        if amounts:
            title = normalize_title(AMOUNT_PATTERN.sub("", line))
            if (not title or not looks_like_item_title(title)) and pending_title:
                title = pending_title
            if (
                amount
                and amount > 0
                and title
                and looks_like_item_title(title)
                and not title.lower().startswith(("st:", "rg:", "ch:", "tr:"))
            ):
                items.append(
                    {
                        "title": title.title(),
                        "amount": amount,
                        "category": fallback_category,
                        "description": "Scanned receipt item",
                    }
                )
            pending_title = ""
            continue

        if looks_like_item_title(line):
            pending_title = normalize_title(line)

    return dedupe_items(items)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing image path"}))
        return

    image_path = sys.argv[1]
    try:
        ocr = RapidOCR()
        result, _ = ocr(image_path)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Could not read the receipt image.",
                    "details": str(exc),
                }
            )
        )
        return
    lines = []
    entries = []

    if result:
        for item in result:
            entry = get_entry_from_ocr_item(item)
            if entry:
                entries.append(entry)
                lines.append(entry["text"])

    lines = [line for line in lines if line]
    merchant = extract_merchant(lines)
    amount = extract_total(lines)
    category = detect_category(lines, merchant)
    date = extract_date(lines)
    items = extract_items_by_position(entries, category) or extract_items(lines, category)
    items = public_items(reconcile_items_to_receipt_total(items, amount, entries, category))

    if amount is None:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Could not detect a receipt total. Try a clearer photo.",
                    "rawText": "\n".join(lines),
                }
            )
        )
        return

    print(
        json.dumps(
            {
                "success": True,
                "title": merchant,
                "amount": amount,
                "category": category,
                "date": date,
                "description": "Scanned receipt",
                "items": items,
                "rawText": "\n".join(lines),
            }
        )
    )


if __name__ == "__main__":
    main()
