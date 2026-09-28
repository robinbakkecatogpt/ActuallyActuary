# Prompt: PDF → kortlek

Ladda upp PDF:en i en chatt med Claude och klistra in allt nedanför linjen.
Spara svaret som `decks/<id>.json`.

---

Gör om det bifogade dokumentet till en kortlek för ett övningsspel. Svara **endast** med giltig JSON enligt formatet nedan, utan kodblock eller annan text.

```json
{
  "id": "kort-id-med-bindestreck",
  "title": "Kort titel",
  "description": "En mening om vad kortleken täcker",
  "tags": ["ämne"],
  "cards": [
    {
      "term": "Begrepp eller fråga",
      "answer": "Rätt svar",
      "distractors": ["Fel svar 1", "Fel svar 2", "Fel svar 3"],
      "explanation": "1–2 meningar som förklarar svaret",
      "statements": [
        { "text": "Ett påstående", "true": true },
        { "text": "Ett subtilt felaktigt påstående", "true": false, "explanation": "Varför det är fel" }
      ]
    }
  ]
}
```

Regler:
- `id`: gemener a–z, siffror och bindestreck. Inga å/ä/ö.
- Använd bara innehåll som faktiskt står i dokumentet. Hitta inte på fakta.
- 15–40 kort beroende på dokumentets omfattning. Prioritera det viktigaste.
- `term`: kort och entydigt, högst ett par rader. Varje term unik.
- `answer`: högst cirka 25 ord, fristående och begripligt utan dokumentet.
- `distractors`: exakt 3 per kort. Samma form, längd och ton som `answer`, så att rätt svar inte sticker ut. De ska vara rimliga men tydligt fel för den som kan ämnet. Använd gärna definitioner av närliggande begrepp.
- `statements`: 1–2 per kort för de viktigaste korten, ungefär hälften sanna. Falska påståenden ska vara subtilt fel (fel riktning, fel villkor, förväxlat begrepp), inte uppenbart absurda. Undvik "alltid/aldrig" som ledtråd.
- `explanation`: valfri men önskad, särskilt där det är lätt att göra fel.
- Skriv på samma språk som dokumentet.
