# geo-viewer-editor

Eine [Web Application]() zur Visualisierung (2D) und Konvertierung von Koordinaten.

![](https://i.imgur.com/A1HiD9w.gif)

# Unterstützte Formate

## Import

- `.jxl` - Trimble JobXML
- `.txt` - `<Name> <Rechtswert> <Hochwert> <Höhe> <Code>`

## Export

- `.xyz` - `<X> <Y> <Z>`
- `.dxf` - Hier werden nur die Punkte Objecte mit dazu gehörigem Text im Layer ausgegeben

# Besondere Fähigkeiten

## Laden und verwenden einer Punktcodeliste

### Format der Punktcodeliste `.json`

```JSON
[
  {
    "code": "112",
    "name": "Mülleimer",
    "group": {
      "code": "1",
      "name": "Möblierung"
    },
    "color": "#FF00FF"
  },
  ...
]
```

## Erstellen eines GIFs

![](https://i.imgur.com/rHnmkpG.jpg)

