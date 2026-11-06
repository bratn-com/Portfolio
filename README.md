# Portfolio

Wizualna kopia [bratn.com](https://www.bratn.com/): strona główna, about, contact i portfolio. Projekty nie są wpisane w HTML. Czyta je `content/portfolio.json`.

## Podgląd na żywo (bez zip)

1. **GitHub Pages (po każdym pushu)**  
   W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.  
   Po pierwszym zielonym workflowzie „Deploy GitHub Pages” adres będzie miał postać  
   `https://<organizacja-lub-user>.github.io/Portfolio/` (dokładny URL jest w zakładce **Actions** przy deployu).

2. **Lokalnie z gitem (najszybszy podgląd u siebie)**  
   ```bash
   git clone https://github.com/bratn-com/Portfolio.git
   cd Portfolio
   git checkout cursor/portfolio-site-a410   # lub main po mergu
   git pull
   python3 -m http.server 8080 --bind 127.0.0.1
   ```  
   Otwórz: `http://127.0.0.1:8080/index.html`

3. **Bez serwera**  
   Możesz też otworzyć `index.html` z dysku — portfolio załaduje dane z `content/portfolio.js`.

## Dodawanie i aktualizacja

Z katalogu repozytorium:

```bash
node scripts/portfolio.mjs list

node scripts/portfolio.mjs add \
  --category desktop \
  --title "Nazwa\nDruga linia" \
  --label "Desktop wesite" \
  --color "#0f5d4f" \
  --image ./sciezka/do-ujecia.jpg

node scripts/portfolio.mjs update transimeksa --title "Nowa nazwa" --image ./nowe.jpg

node scripts/portfolio.mjs remove transimeksa
```

Kategorie: `desktop`, `mobile`, `motion`. `\n` w tytule łamie linię tak jak na planszy. Id powstaje z pierwszej linii tytułu; inne id podajesz przez `--id`. Kolejność na stronie jest kolejnością wpisów w `content/portfolio.json`. Na jednej planszy mieszczą się cztery prace; kolejna czwórka jest następną stroną.

Obraz trafia do `content/images/`. Usunięcie projektu zostawia plik obrazu.
