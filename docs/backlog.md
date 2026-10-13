# Backlog

Improvement ideas to pick up after v0.1. Each one would start its own SDLC run (see `docs/agentic/`).

| # | Idea | Notes | Relates to v0.1 PRD |
|---|------|-------|---------------------|
| 1 | **Volvo API for car data:** read battery size, charging speed, electric use, remaining battery capacity and petrol use from the car instead of manual input | Needs Volvo developer access and OAuth for the driver's car | Out of Scope: "Connections to the Volvo API … manual input only in v0.1" |
| 2 | **Dynamic petrol price:** fetch the current price for a petrol station the driver picks | Need a source for station-level prices in NL | Out of Scope: "Automatic petrol prices" |
| 3 | **Charging card tariffs:** fetch the start fee and markup for the charging card the driver picks | Card providers rarely publish an API; a maintained table may be a fallback | Out of Scope: "Connections to … ANWB or other card providers" |
| 4 | **Search near a location:** type a place or address and look for chargers around it | v0.1 moves the spot by dragging the map | Out of Scope: "Address search (withdrawn for v0.1 by D-3)" |
| 5 | **Open charger in Google Maps:** a link from a charging station result that opens it in Google Maps for navigation | Can be a plain `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` URL, no API key | New |

_Captured 2026-10-13._
