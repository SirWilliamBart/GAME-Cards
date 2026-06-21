# Game Cards

Game Cards is a simple customizable card-game web app for parties, picnics, dates, and small groups.

The app lets players draw, read, create, and customize cards with different types, difficulty levels, spice levels, player counts, tags, and special visual effects.

## Features

- Play with a deck of activity, question, and challenge cards.
- Create custom cards directly in the card creator.
- Edit card text directly inside the card preview.
- Customize card styles with gradients and icons.
- Use emojis as large background icons for special cards.
- Organize cards with descriptive tags.
- Store decks in a readable JSON format.
- Support different card types such as challenges, questions, and special cards.
- Mobile-friendly card creation workflow.

## Card data format

Cards are stored in JSON. Each card contains text, difficulty, player count, spice level, type, and tags.

Example card:

```json
{
  "text": "Každý vybere jedno jídlo z pikniku a vymyslí mu dramatický původní příběh.",
  "dificulty": "1",
  "players": "2",
  "spice": "1",
  "type": "challenge",
  "tags": ["creative/imagination", "fun/playful", "silly", "requisities"]
}
```

The full deck file contains a list of available tags and a list of cards:

```json
{
  "tags": [
    "quick",
    "acting",
    "cooperative",
    "versus",
    "fun/playful",
    "requisities",
    "active/physical",
    "memories",
    "spicy",
    "hypotheticals",
    "creative/imagination",
    "pop_culture/media",
    "feelings",
    "relationship",
    "childhood",
    "thoughts/opinions",
    "silly",
    "rant",
    "casual",
    "romantic"
  ],
  "cards": [
    {
      "text": "Každý vybere jedno jídlo z pikniku a vymyslí mu dramatický původní příběh.",
      "dificulty": "1",
      "players": "2",
      "spice": "1",
      "type": "challenge",
      "tags": ["creative/imagination", "fun/playful", "silly", "requisities"]
    }
  ]
}
```

## Tags

Tags are used to describe the mood, style, and purpose of each card.

Available tags:

- `quick`
- `acting`
- `cooperative`
- `versus`
- `fun/playful`
- `requisities`
- `active/physical`
- `memories`
- `spicy`
- `hypotheticals`
- `creative/imagination`
- `pop_culture/media`
- `feelings`
- `relationship`
- `childhood`
- `thoughts/opinions`
- `silly`
- `rant`
- `casual`
- `romantic`

Using more tags makes filtering and organizing cards easier.

## Running the project

The project can be opened directly in a browser.

For local development, open the project folder and run a simple local server:

```bash
python -m http.server 8000
```

Then open the app in the browser:

```text
http://localhost:8000
```

## Adding new cards

To add a new card, add a new object to the `cards` array in the card JSON file.

Example:

```json
{
  "text": "Vymysli název filmu podle dnešního pikniku a ostatní hádají jeho žánr.",
  "dificulty": "1",
  "players": "2+",
  "spice": "1",
  "type": "challenge",
  "tags": ["creative/imagination", "fun/playful", "silly", "quick"]
}
```

When adding new cards:

- Keep the JSON valid.
- Use tags from the global `tags` list.
- Keep difficulty and spice values consistent.
- Use short and clear card text.
- Choose a type that matches the card activity.

## Card types

The app can support multiple card types, for example:

- `question` — a card asking players to answer something.
- `challenge` — a card asking players to do something.
- `special` — a card with a stronger visual effect or unique behavior.

## Special cards

Special cards can use a large emoji or icon in the background of the card.

Example CSS:

```css
.card.special-game .card-front::after {
  content: "🎮";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 96px;
  opacity: 0.75;
  pointer-events: none;
  filter:
    drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
}
```

The visibility of the icon can be changed with the `opacity` value.

## Card creator

The card creator allows users to create and style their own cards.

Main options include:

- Editing card text.
- Selecting card type.
- Choosing difficulty.
- Choosing spice level.
- Setting player count.
- Selecting tags.
- Choosing a custom icon or emoji.
- Adjusting the card gradient.
- Previewing the card before saving it.

## Styling

Card appearance is controlled mainly through CSS.

Common style options include:

- Background gradient.
- Text color.
- Border radius.
- Card shadow.
- Icon size.
- Icon opacity.
- Special card effects.

## Project goals

The goal of this project is to create a simple, flexible, and easily editable card-game app.

The app should be easy to customize for different situations, such as:

- Picnic games
- Party games
- Date games
- Friend group activities
- Conversation starters
- Creative challenges