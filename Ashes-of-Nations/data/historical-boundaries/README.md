# Historical boundary overlays

Put optional historical boundary GeoJSON files here. `tools/build-world-map.mjs`
uses them as extra cut lines on top of the modern country and admin-1 map.

Supported file names:

- `1600.geojson`
- `world-1886.geojson`
- any `.geojson` or `.json` file with a year from `1600` through `2025`

Supported feature properties:

- `year`, `YEAR`, `yr`, `YR`, `date`, `DATE` for the feature year
- `startYear`/`endYear`, `START_YEAR`/`END_YEAR`, `from`/`to`, `FROM`/`TO`,
  or `gwsyear`/`gweyear` for validity ranges
- `NAME_RU`, `name_ru`, `NAME_LONG`, `ADMIN`, `SOVEREIGNT`, `NAME_EN`,
  `NAME`, `name`, `polity`, `country`, or `CNTRY_NAME` for labels

If no files are present, the world map is generated from the modern Natural
Earth country and admin-1 sources only.
