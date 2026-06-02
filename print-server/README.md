# Tipsy POS Local Print Server

A high-performance, modular, and resilient local Node.js print server for thermal ESC/POS network (LAN) printing in restaurant environments.

## Features

- **ESC/POS Silent Printing**: Directly communicates with network/LAN thermal printers over TCP.
- **Supabase Realtime Sync**: Instantly prints kitchen order tickets (KOT) or customer bills.
- **Smart Connection Resilience**: Gracefully manages network drops, timeouts, and retries.
- **Dynamic Caching**: Local real-time sync of printer configs to minimize DB queries and optimize performance.
- **No Crash Architecture**: Recovers from unhandled exceptions and error states without crashing.

---

## Folder Structure

```
print-server/
├── .env                # Runtime environment configurations
├── .env.example        # Configuration templates
├── package.json        # Dependencies & scripts
└── src/
    ├── index.js        # Server entrypoint and banner bootstrapper
    ├── config/
    │   └── supabase.js # Database client initialization & validation
    ├── services/
    │   ├── listener.js # Realtime subscription and pending queue scheduler
    │   └── printer.js  # ESC/POS layout formatting & TCP socket driver
    └── utils/
        └── logger.js   # Structured colorful terminal logs
```

---

## Setup Instructions

### 1. Prerequisite
Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed on the printer host machine.

### 2. Install Dependencies
Navigate into the print-server directory and install dependencies:
```bash
npm install
```

### 3. Configuration
Copy `.env.example` to `.env` if not already done, and adjust the credentials:
```bash
cp .env.example .env
```

Open `.env` and fill in the details:
- **`SUPABASE_URL`**: Your Supabase project URL (found under Project Settings -> API).
- **`SUPABASE_SERVICE_ROLE_KEY`**: Your service role key (found under Project Settings -> API -> `service_role`). Service role key is highly recommended for backend print servers to listen to print queue updates and update statuses seamlessly.
- **`RESTAURANT_ID`**: The UUID of your specific restaurant branch to make sure this local print server only handles jobs for your printer location.

### 4. Running the Server

#### Development mode (with file-watch auto restart):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

---

## ESC/POS Print Schema Formats

The print server supports two primary job types:

### 1. KOT (Kitchen Order Ticket)
Send food items to kitchen printers or drinks to bar printers. Extremely high legibility, large table numbers, and double-width/bold modifiers.

**Payload Structure:**
```json
{
  "type": "KOT",
  "tableName": "Table",
  "tableNumber": "5",
  "captainName": "John Doe",
  "kotNumber": "KOT-9843",
  "timestamp": "2026-06-02T02:00:00Z",
  "items": [
    { "name": "Spicy Garlic Ramen", "quantity": 2, "notes": "Extra spicy, no spring onion" },
    { "name": "Pork Gyoza", "quantity": 1, "notes": "" }
  ]
}
```

### 2. BILL (Customer Invoice)
Prints an elegant, highly structured thermal customer invoice with subtotal, tax details, payment method, and footers.

**Payload Structure:**
```json
{
  "type": "BILL",
  "restaurantName": "Tipsy POS",
  "restaurantAddress": "123 Food Street, Gastronomy Ville",
  "restaurantPhone": "+1 (555) 019-2834",
  "tableName": "Table",
  "tableNumber": "5",
  "captainName": "John Doe",
  "invoiceNumber": "INV-284920",
  "timestamp": "2026-06-02T02:30:00Z",
  "subtotal": 45.50,
  "taxPercent": 5.0,
  "taxAmount": 2.28,
  "grandTotal": 47.78,
  "paymentMethod": "UPI",
  "isPaid": true,
  "items": [
    { "name": "Spicy Garlic Ramen", "quantity": 2, "price": 18.00 },
    { "name": "Pork Gyoza", "quantity": 1, "price": 9.50 }
  ]
}
```
