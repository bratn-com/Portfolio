# Portfolio

Wizualna kopia [bratn.com](https://www.bratn.com/): strona główna, about, contact i portfolio. Projekty nie są wpisane w HTML. Czyta je `content/portfolio.json`.

## Podgląd na żywo (bez zip)

1. **GitHub Pages (po każdym pushu)**  
   W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions** i zapisz.  
   Jeśli wcześniej było „None” lub „Deploy from a branch”, GitHub musi to zapisać zanim zadziała `actions/deploy-pages` — inaczej w logu zobaczysz **404** przy `Failed to create deployment` i komunikat „Ensure GitHub Pages has been enabled”.  
   Po pierwszym zielonym workflowzie „Deploy GitHub Pages” adres będzie miał postać  
   `https://<organizacja-lub-user>.github.io/Portfolio/` (dokładny URL jest w zakładce **Actions** przy deployu albo ponownie w **Settings → Pages**).  
   **Repozytorium prywatne:** publiczne GitHub Pages z Actions wymaga planu płatnego (Team/Enterprise); przy darmowym koncie ustaw repo na **public** albo zostań przy podglądzie lokalnym (`git pull` + `http.server`).  
   Jeśli w logu widzisz **„Branch … is not allowed to deploy to github-pages”**, to ktoś ustawił **ochronę środowiska** `github-pages` (Settings → Environments). Workflow w repo jest bez tego bloku; jeśli nadal używasz własnej wersji z `environment: github-pages`, dopisz branch albo wyłącz reguły dla tego środowiska.

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
  --label "Desktop website" \
  --color "#0f5d4f" \
  --media ./sciezka/do-ujecia.jpg

node scripts/portfolio.mjs add \
  --category motion \
  --title "Tytuł\nDruga linia" \
  --label "Motion" \
  --color "#222222" \
  --media ./spot.mp4

node scripts/portfolio.mjs update transimeksa --title "Nowa nazwa" --media ./nowe.jpg

node scripts/portfolio.mjs remove transimeksa
```

Kategorie: `desktop`, `mobile`, `motion`. `\n` w tytule łamie linię tak jak na planszy. Id powstaje z pierwszej linii tytułu; inne id podajesz przez `--id`. Kolejność na stronie jest kolejnością wpisów w `content/portfolio.json`. Na jednej planszy mieszczą się cztery prace; kolejna czwórka jest następną stroną.

**Plik w karcie (`--media`, alias `--image`):** jpg, png, webp, gif, **mp4 / webm / ogv** (odtwarzanie w pętli, bez dźwięku, z lekkim zoomem przy hoverze jak na zrzutach) albo **svg** (także animowany SMIL/CSS w pliku). Duże wideo trzymaj pod kontrolą rozmiaru — GitHub i Pages mają limity rozmiaru repozytorium.

Plik trafia do `content/images/`. Usunięcie projektu zostawia plik na dysku.

### Mockup „skew” z zrzutu ekranu (PNG na tle koloru projektu)

Dla kart na stronie portfolio zapis obrazka z `skew` w nazwie dostaje klasę `card-visual-skew` i **bez** dodatkowego CSS-owego 3D (żeby nie dublować przechyłu). Generator:

```bash
python3 scripts/skew_cover.py content/images/Twój-zrzut.png \
  -o content/images/projekt-skew.png \
  --bg "#ec413a" \
  --shadow
```

`--bg` ustaw na `color` projektu z `content/portfolio.json`. Potem ustaw `image` na wygenerowany plik w `content/portfolio.json` **i** w `content/portfolio.js` (`window.PORTFOLIO` musi być zgodny z JSON — przy edycji przez `portfolio.mjs add/update` plik `.js` jest generowany automatycznie).
