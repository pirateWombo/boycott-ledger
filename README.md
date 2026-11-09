# Boycott Ledger

Progressive Web App for barcode scanning and company database search.

## Features
- Barcode scanner (html5-qrcode) with GS1 Japanese prefix detection (450–459, 490–499)
- Database of companies with red / orange / green status
- Live partial-match search
- Dark mode, tabbed interface
- Camera starts only on Scanner tab and stops on switch

## Deploy
Enable GitHub Pages on the `main` branch (root). Site will be available at:
https://pirateWombo.github.io/boycott-ledger/

Camera requires HTTPS (provided by GitHub Pages).

## Local development
Serve the folder with any static server (e.g. `python -m http.server` or VS Code Live Server) so the service worker and fetch work.

## Edit data
Update `database.json` — add barcodes or companies. Status values: `red`, `orange`, `green`.
