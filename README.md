# ActuallyActuary

Övningsspel med tre lägen: vänd kortet, flerval och sant/falskt. Fungerar i webbläsare på dator och mobil.

## Lägga till en kortlek

1. Gör om en PDF till JSON med prompten i `PROMPT.md`.
2. Lägg filen i `decks/` (på GitHub: öppna mappen `decks` → **Add file → Upload files**).
3. Commit. Efter någon minut finns kortleken i spelet.

GitHub Actions validerar alla kortlekar vid varje ändring. Är en fil trasig stoppas publiceringen och felet syns under fliken **Actions**; den senaste fungerande versionen ligger kvar.

Formatet beskrivs i `schema/deck.schema.json`. Bara `id`, `title` och `cards` (med `term` och `answer`) är obligatoriska.

## Lokala kortlekar

Material som inte ska ligga publikt kan laddas in med **Lägg till lokal kortlek** i appen. Det sparas bara i den webbläsaren.

## Kontroller

| Läge | Tangentbord | Mus/mobil |
|---|---|---|
| Vänd kortet | Mellanslag vänder, ← kunde inte, → kunde | Tryck vänder, knappar eller svep |
| Flerval | ↑ ↓ och Enter, eller 1–4 | Klick |
| Sant/falskt | ← sant, → falskt, Enter | Klick |

Enter går till nästa kort efter svar. Esc avslutar omgången.
