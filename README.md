# Portfolio

Wizualna kopia [bratn.com](https://www.bratn.com/): strona główna, about, contact i portfolio. Projekty nie są wpisane w HTML. Czyta je `content/portfolio.json`.

Żeby przeklikać stronę, rozpakuj branch i otwórz `index.html` w przeglądarce. Serwer nie jest potrzebny.

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
