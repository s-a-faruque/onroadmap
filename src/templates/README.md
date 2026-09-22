# Roadmap templates

Add one `.json` file to this directory to make a template available in the Templates drawer. Vite discovers the files automatically at build time.

Each file must contain:

```json
{
  "id": "unique-template-id",
  "name": "Template name",
  "title": "Roadmap title",
  "subtitle": "Short roadmap description",
  "monthSpan": 6,
  "lanes": [
    { "id": "build", "name": "Build" }
  ],
  "tasks": [
    {
      "laneId": "build",
      "title": "First milestone",
      "startDay": 0,
      "duration": 30,
      "color": "#247ba0",
      "tags": ["Planning"]
    }
  ]
}
```

Use a unique `id`. Every task `laneId` must match a lane `id`. `startDay` and `duration` are offsets in days from the selected start month.
