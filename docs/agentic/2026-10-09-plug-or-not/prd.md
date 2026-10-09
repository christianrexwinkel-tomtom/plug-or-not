# PRD: Plug or Not — is charging here worth it? (v0.1 proof of concept)

**Date:** 2026-10-09
**Status:** Approved
**Template version:** default/0.2.1
**References:** User journey page "Worth-It Charging Journey" (https://claude.ai/artifact/QH6WeJ3mzufmZHDaAQ62VW); NDW open data (https://opendata.ndw.nu/): `charging_point_locations_ocpi.json.gz`, `charging_point_tariffs_ocpi.json.gz`; prior art: GE patent CN102529851A
**Plugin version:** 0.5.3
**Agent Sessions:** claude-code: 5d4e9523-19b6-4b26-8e51-d031314dc40e
**Self-review:** Review loop after user comments: CAP_REACHED — round-2 findings fixed, not re-reviewed. Finding: "Story 2, Scenario 5 has no battery level and no expected figure"; fixed by adding a 20% battery and the expected €6.80 total. (First loop also ended at CAP_REACHED; its round-2 findings on FR-013 wording and straight-line distance were fixed.)

---

<!-- hint: Keep the body narrative, readable top-to-bottom. Reference-heavy material (decisions log, glossary) belongs in appendices at the end of the document. -->

## TL;DR

Plug or Not is a web page for drivers of plug-in hybrid cars (PHEVs). When they park, it answers one question: is plugging in at a nearby public charger cheaper than driving the same distance on petrol? It lists the 10 nearest chargers, best saving first, and shows for each one how long the driver needs to stay for charging to pay off. Charging prices often mix kWh prices, time fees and start fees, so drivers can't work this out at the charger. One real session cost more than driving the same distance on petrol would have. Version 0.1 is a proof of concept for the Netherlands: the driver enters their car, card and battery details by hand. Planning ahead for a destination, car and card connections, and in-car use come later.

## Overview

- **Purpose**: Let a plug-in hybrid driver who has just parked see, within seconds, which nearby public chargers are cheaper than petrol for their stay, how much they save, and for which stay lengths charging pays off.
- **User Value**: Public charging prices combine energy, time, parking and start fees, and the result depends on the car's charging speed, the room left in the battery and the length of stay. Drivers can't calculate this on the spot and regularly pay more than petrol would have cost. Example: a 4h53 session in Culemborg cost €14.79 for 16.64 kWh, which is €0.89 per kWh. For that driver's car, electric driving only beats petrol below about €0.80 per kWh.
- **Scope**: A web page that runs in phone and laptop browsers, for the moment the driver is parked ("parked here now"), for public AC chargers in the Netherlands. The driver enters car, charge card, petrol price and current battery level by hand. Comparison is against petrol only.

## User Stories

| Story | Description | Priority |
|-------|-------------|----------|
| S1: Set up my car and costs | Enter car, charge card and petrol details once, and have them remembered | P1 |
| S2: See which nearby chargers are worth it | Get the 10 nearest chargers ranked by saving compared with petrol, for my current spot | P1 |
| S3: Tell the app how long I'll stay | Pick an event type that fills in a typical stay, and adjust it | P1 |
| S4: See the worth-it window | See for each charger the range of stay lengths for which charging beats petrol | P1 |
| S5: Use a typed address instead of my location | Search for an address or place when location is unavailable or for a demo | P2 |

Unless a scenario says otherwise, every scenario with numbers uses the example settings from Story 1, Scenario 1 (no card markup), and chargers whose maximum AC power is at least the car's 3.6 kW.

### Story 1: Set up my car and costs

- **As a** plug-in hybrid driver who charges in public
- **I want to** enter my car's figures, my charge card's fees and the petrol price once
- **So that** every answer is calculated for my own car and costs without retyping them

#### Acceptance Scenarios

**Scenario 1: Happy Path**
- **Given** a driver opens Plug or Not for the first time on this device
- **When** they enter usable battery size 15 kWh, charging speed 3.6 kW, electric use 0.25 kWh/km, petrol use 12 km/L, petrol price €2.399/L, card start fee €0.89 and card markup €0.00/kWh, and save
- **Then** they go straight to the "parked here now" screen
- **And** when they reopen the page later on the same device and browser, the saved values are used without asking again

**Scenario 2: Error Path**
- **Given** a driver is filling in the setup
- **When** they leave a required field empty or enter a value outside its allowed range (e.g. charging speed 0 kW or petrol price €25/L)
- **Then** the field is marked, a message says which value is needed and its allowed range, and the setup can't be saved until it's corrected

**Scenario 3: Edge Case — changing the petrol price**
- **Given** a driver has saved settings and the petrol price has changed
- **When** they open settings, change only the petrol price to €2.459/L and save
- **Then** all other values stay unchanged and the next answer uses €2.459/L

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: saving | Driver taps save | Saving is instant. The driver lands on the "parked here now" screen with no separate loading state |
| Comma decimals | Driver types "2,399" instead of "2.399" | Accepted as 2.399 |
| Browser storage unavailable | Private browsing, or storage blocked | The page works for this visit and shows a notice: "Your settings won't be remembered in this browser." |
| Different device | Driver opens the page on a laptop after setting up on a phone | Setup is asked again. Settings live on each device separately |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Required value missing | "Enter your car's charging speed (kW) to continue." | Highlights the field and blocks saving |
| Value out of range | "Charging speed must be between 1 and 22 kW." | Highlights the field and blocks saving |
| Settings can't be stored | "Your settings won't be remembered in this browser. You can still use Plug or Not now." | Keeps the values for the current visit only |

### Story 2: See which nearby chargers are worth it

- **As a** plug-in hybrid driver who has just parked
- **I want to** see the nearest chargers ranked by how much they save me compared with petrol
- **So that** I can decide in seconds whether to plug in, and where

#### Acceptance Scenarios

**Scenario 1: Happy Path**
- **Given** a driver with the example settings from Story 1 is parked on Parkstraat in Nuenen, and the stay is set to 45 minutes
- **And** the nearest charger, Vattenfall Parkstraat 21 (74 m), has a tariff of €0.2691/kWh excluding VAT with no other fees, and the Allego charger at Kerkstraat 6 (266 m) charges €2.479/h excluding VAT with no kWh price
- **When** they allow location, enter a current battery level of 20%, and request the answer
- **Then** they see the 10 nearest public charging locations with an AC charging point, ordered by saving, biggest first
- **And** each entry shows: operator, address, straight-line distance in metres, price summary, a verdict ("Worth it", "Not worth it for this stay" or "Never worth it"), the saving or extra cost in euros, the cost per km next to the petrol cost per km, the kWh added, and the worth-it window (Story 4)
- **And** Vattenfall Parkstraat 21 shows "Worth it" with 2.7 kWh added, a total cost of €1.77 and a saving of €0.39, and the Allego charger at Kerkstraat 6 shows "Never worth it"
- **And** the screen states the date and time of the tariff data used

**Scenario 2: Error Path**
- **Given** a driver requests the answer
- **When** the charger and tariff data can't be loaded (no connection, or the data service doesn't respond)
- **Then** the page shows "Couldn't load charger prices. Check your connection and try again." with a "Try again" button, and shows no answer based on partial data

**Scenario 3: Edge Case — battery already full**
- **Given** a driver enters a current battery level of 100%
- **When** they request the answer
- **Then** the page says "Your battery is full, so there's nothing to charge here." and lists no savings

**Scenario 4: Edge Case — card markup and VAT**
- **Given** the example settings from Story 1, but with a card markup of €0.05/kWh, a battery at 20%, and a charger with a tariff of €0.30/kWh excluding VAT and no other fees
- **When** the driver sets a stay of 1 hour
- **Then** the entry shows 3.6 kWh added and a total cost of €2.38: €0.89 start fee + 3.6 kWh × (€0.30 + 21% VAT + €0.05 markup)

**Scenario 5: Edge Case — time-of-day prices**
- **Given** the nearest charger is E-Flux Het Voorburg 6, Culemborg, with €0.5717/kWh from 16:00 to 22:00 and €0.5417/kWh at other times, plus €0.41/h
- **When** a driver with a battery at 20% parks there at 15:30 with a stay of 2 hours
- **Then** the cost applies the off-peak price from 15:30 to 16:00 and the peak price from 16:00 to 17:30
- **And** the entry shows 7.2 kWh added and a total cost of €6.80: €0.89 start fee + 1.8 kWh × €0.5417 + 5.4 kWh × €0.5717 + 2 h × €0.41, with 21% VAT on the tariff parts

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: calculating | Driver requests the answer | A "Finding chargers near you…" state is shown. The answer replaces it, typically within a few seconds |
| Charger without a published tariff | One of the 10 nearest has no tariff in the data | Listed last with "Price unknown". It still counts as one of the 10 |
| Location with different tariffs per point | One location has AC points with different tariffs | Each distinct tariff appears as its own entry, with the same address and distance. The location still counts once towards the 10 |
| Charger faster than the car | Charger supports 22 kW, the car 3.6 kW | The car's speed is used |
| Car faster than the charger | Car 11 kW, charger 3.7 kW | The charger's maximum power is used |
| Battery nearly full | Battery 90% of 15 kWh | kWh added stops at the room left in the battery (1.5 kWh); the start fee weighs heavily and the verdict reflects that |
| Only DC fast chargers nearby | No AC charging points among nearby locations | DC-only locations are not listed. The 10 nearest locations with AC points are shown, however far |
| Ties on saving | Two chargers save exactly the same | The nearer one comes first |
| Location outside the Netherlands | GPS or address search places the driver in Belgium | "Charger prices are available for the Netherlands only for now." No list is shown |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Charger data can't be loaded | "Couldn't load charger prices. Check your connection and try again." | Shows a "Try again" button. No partial answer |
| Battery level missing or invalid | "Enter your current battery level (0–100%)." | Highlights the field and blocks the request |
| Outside coverage | "Charger prices are available for the Netherlands only for now." | Shows no list. Offers address search (Story 5) |
| Settings missing | "Set up your car first so we can calculate your costs." | Opens the setup (Story 1) |

### Story 3: Tell the app how long I'll stay

- **As a** driver who knows what I'm parking for, but not exactly for how long
- **I want to** pick what I'm doing and get a typical stay that I can adjust
- **So that** I don't have to work out a duration before every stop

#### Acceptance Scenarios

**Scenario 1: Happy Path**
- **Given** a driver is on the "parked here now" screen
- **When** they pick the event type "Meeting"
- **Then** the stay is set to 2h30
- **And** the ranking and every result update to that stay

**Scenario 2: Error Path**
- **Given** a driver adjusts the stay by hand
- **When** they try to set it below 15 minutes or above 24 hours
- **Then** the stay stops at the limit (15 min or 24 h) and a short note says the allowed range

**Scenario 3: Edge Case — adjusting after picking an event type**
- **Given** the driver picked "Shopping" (1h30)
- **When** they change the stay to 1h15
- **Then** results update to 1h15 and the event type shows as "Shopping (adjusted)"

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: updating | Driver changes the stay | Results update without reloading the page. No spinner for recalculating already-loaded chargers |
| No event type picked | Driver opens the screen and doesn't pick | The stay defaults to "Shopping" (1h30) in v0.1 (remembering the last used type is fast-follow, FR-023) |
| Overnight across midnight | Driver picks "Overnight" at 21:00 | A 12-hour stay ending at 09:00 the next day, with time-of-day prices applied across midnight |
| Event type list | Driver opens the picker | Options and default stays: Quick errand 30 min, Shopping 1h30, Café or restaurant 2h, Sports or leisure 2h, Meeting 2h30, Workday 8h, Overnight 12h |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Stay below the minimum | "Stays can be 15 minutes to 24 hours." | Sets the stay to 15 min |
| Stay above the maximum | "Stays can be 15 minutes to 24 hours." | Sets the stay to 24 h |

### Story 4: See the worth-it window

- **As a** driver whose stay estimate may be wrong
- **I want to** see for each charger the range of stay lengths for which charging beats petrol
- **So that** I can judge the answer even when I'm not sure how long I'll stay

#### Acceptance Scenarios

**Scenario 1: Happy Path**
- **Given** the example settings from Story 1, a battery at 10%, and the charger Opcharge Zernikestraat 17, Eindhoven (€0.43/kWh, €0.50 per session, €0.50/h once the battery is full)
- **When** the driver views the results
- **Then** the entry shows "Worth it if you stay 1h30 to 7h30"
- **And** for Vattenfall Marconilaan 183, Eindhoven (€0.2691/kWh only), it shows "Worth it if you stay at least 35 min"

**Scenario 2: Error Path**
- **Given** a charger whose tariff can't be interpreted
- **When** the driver views the results
- **Then** the entry shows "Price unknown" and no window, instead of a window based on a guess

**Scenario 3: Edge Case — no window**
- **Given** the example settings from Story 1, a battery at 10%, and the charger E-Flux Laboratoriumstraat 2, Eindhoven (€0.5417/kWh plus €0.41/h, excluding VAT)
- **When** the driver views the results
- **Then** the entry shows "Never worth it: always more expensive than petrol for your car"

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending | Results are loading | The window appears together with the rest of the entry, never on its own afterwards |
| Stay outside the window | Stay 45 min, window starts at 1h05 | Verdict "Not worth it for this stay", with "Worth it if you stay at least 1h05" |
| Window reaches 24 hours | No time or parking fees | Shown as "at least X" with no upper limit |
| Window starting at the minimum | Even a 15-minute stay is worth it | Shown as "Worth it for any stay" (up to the upper limit, if there is one) |
| Battery level changes the window | Driver changes battery from 10% to 70% | Windows are recalculated. Less room means fewer kWh, so lower edges move later or the window disappears |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Tariff can't be interpreted | "Price unknown" | No window or verdict. Entry listed last |

### Story 5: Use a typed address instead of my location

- **As a** driver whose phone can't share its location, or a presenter demoing on a laptop
- **I want to** type an address or place and get the answer for that spot
- **So that** the page works without GPS and for any place I want to check

#### Acceptance Scenarios

**Scenario 1: Happy Path**
- **Given** a driver on the "parked here now" screen
- **When** they type "Klokgebouw 50 Eindhoven" and pick the matching suggestion
- **Then** results are calculated for that spot exactly as for a GPS location
- **And** the screen shows the address the results are for

**Scenario 2: Error Path**
- **Given** a driver denies location access
- **When** the page asks for location
- **Then** it shows "We couldn't get your location. Type an address or place instead." with the address field focused

**Scenario 3: Edge Case — place outside the Netherlands**
- **Given** a driver types "Grand-Place Brussels" and picks the suggestion
- **When** results are requested
- **Then** the page shows "Charger prices are available for the Netherlands only for now." and no list

**Scenario 4: Edge Case — no match**
- **Given** a driver types an address
- **When** no place matches
- **Then** the page shows "No place found for '<text>'. Check the spelling or try a nearby street." and no results

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: searching | Driver types | Suggestions appear as they type, with a short "Searching…" state |
| Weak GPS | Location is only accurate to 1 km or worse | The page shows "Your location is approximate" and offers address search |
| Several matches | "Dalkruid" matches several streets in several towns | Up to 5 suggestions are shown, each with its town, for the driver to pick |
| Address search unavailable | The address service doesn't respond | "Address search isn't available right now. Try your location instead." |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Location denied | "We couldn't get your location. Type an address or place instead." | Focuses the address field |
| No match | "No place found for '<text>'. Check the spelling or try a nearby street." | Keeps the typed text for editing |
| Address service unavailable | "Address search isn't available right now. Try your location instead." | Keeps the location option available |

## Story Dependencies

- S2 depends on S1: costs can't be calculated without the car, card and petrol figures.
- S2 depends on S3: every result is calculated for a stay length.
- S4 depends on S2: the window is part of each charger entry.
- S5 is an alternative way into S2. It depends on S2, and S2 works without it when location is available.

## Functional Requirements

- **FR-001**: System MUST let the driver enter and save: usable battery size (kWh), charging speed on AC (kW), electric consumption (kWh/km), petrol consumption (km/L), petrol price (€/L), charge card start fee (€ per session) and charge card markup (€/kWh). Card fees default to €0.
- **FR-002**: Withdrawn. Charging losses are not modelled in v0.1 (see D-16).
- **FR-003**: System MUST remember saved settings on the same device and browser between visits, without an account.
- **FR-004**: System MUST validate each setting against its allowed range and block saving until all are valid. Ranges: usable battery 1–40 kWh; charging speed 1–22 kW; electric consumption 0.10–0.40 kWh/km; petrol consumption 5–30 km/L; petrol price €0.50–€5.00/L; card start fee €0–€5; card markup €0–€1/kWh.
- **FR-005**: System MUST ask for the current battery level (0–100%) on the "parked here now" screen.
- **FR-006**: System MUST use the phone's or laptop's location when the driver allows it.
- **FR-007**: System MUST let the driver search for an address or place anywhere in the EU and the US, with up to 5 suggestions shown while typing, when location is denied, unavailable or approximate, or whenever the driver chooses to.
- **FR-008**: System MUST, for a spot in the Netherlands, list the 10 nearest public charging locations that have at least one AC charging point, based on straight-line distance from the chosen spot.
- **FR-009**: System MUST show the straight-line distance in metres from the chosen spot for each listed location.
- **FR-010**: System MUST order the list by saving compared with petrol, biggest first; ties go to the nearer location; locations with an unknown price come last.
- **FR-011**: System MUST calculate the cost of a session from the operator's published tariff, including energy, time, parking-after-full and per-session components, applied over the actual stay starting now, including time-of-day price changes. 21% VAT is added to every tariff component, and time-based components are charged per minute. Prices shown include VAT.
- **FR-012**: System MUST add the charge card's start fee and markup per kWh to every session cost. Card fees are entered as shown on the card's price list, including VAT, so no VAT is added to them.
- **FR-013**: System MUST calculate the energy added as the lower of: charging speed (the lower of the car's and the charger's maximum) × stay, or the room left in the battery from the current battery level. The energy billed and the energy that reaches the battery are treated as the same.
- **FR-014**: System MUST calculate the petrol cost for the same distance the added energy covers, using the driver's electric consumption, petrol consumption and petrol price. The distance is the energy added divided by the electric consumption.
- **FR-015**: System MUST show for each location: operator, address, straight-line distance, a short price summary, verdict, saving or extra cost (€), cost per km next to petrol cost per km, kWh added, and the worth-it window.
- **FR-016**: System MUST show the worth-it window as the shortest and longest stay, between 15 minutes and 24 hours in 5-minute steps, for which charging is cheaper than petrol. It must show "at least X" when there's no upper limit, and "Never worth it" when no such stay exists.
- **FR-017**: System MUST offer the event types Quick errand (30 min), Shopping (1h30), Café or restaurant (2h), Sports or leisure (2h), Meeting (2h30), Workday (8h) and Overnight (12h), each setting the stay to its typical duration.
- **FR-018**: System MUST let the driver adjust the stay between 15 minutes and 24 hours in 15-minute steps, and update all results without reloading.
- **FR-019**: System MUST show the date and time of the tariff data used.
- **FR-020**: System MUST show "Price unknown" with no verdict or window for locations whose tariff is missing or can't be interpreted.
- **FR-021**: System MUST show plain-language messages for: data that can't be loaded, a full battery, a spot outside the Netherlands, location denied, and no address match (see the story error tables).
- **FR-022**: System MUST show a separate entry for each distinct AC tariff at a location; the location counts once towards the 10 nearest.
- **FR-023**: System SHOULD remember the last used event type and use it as the default next time.

## Success Metrics

| Metric | What it tells us | Direction |
|--------|------------------|-----------|
| Predicted cost within €0.25 of the real bill, for at least 5 of the driver's own sessions (compared with the invoice for each session) | The calculation matches real-world billing | up (target 5 of 5) |
| Time from opening the page (settings saved) to the answer on screen: under 30 seconds, measured with a stopwatch in 5 trial runs on a phone | It's usable at the charger | down (target under 30 s) |
| Number of PMs who, after a demo, say they want to pursue the idea (recorded in demo notes) | The proof of concept persuades product management | up (target at least 3) |
| Guardrail: sessions where the app said "Worth it" but the bill turned out more expensive than petrol for the same km (from the 5 compared sessions) | Trust: the app must never steer the driver into a more expensive choice | must not exceed 0 |

## Release Slicing

| Release | Contents (stories / FRs) | Rationale for this cut |
|---------|--------------------------|------------------------|
| v1 (v0.1 proof of concept) | S1–S5; FR-001–FR-022 | The smallest cut that answers "is it worth plugging in here?" end to end, with real NDW tariffs, for demos and the driver's own sessions |
| fast-follow | FR-023; planning ahead for a destination (moment 1 from the journey page); live availability labels | Convenience and the second journey moment, both reusing the same calculation |
| later | Stay estimate from calendar and own history; battery level from the Volvo API; charge card details from the card provider; Android Automotive in-car version; worth-it colouring in navigation; full electric cars (comparison against other chargers); charger coverage in the EU and the US; vehicle integration (possible IP, discussed separately) | Each needs an outside integration or partner, which the proof of concept should validate first |

## Non-Functional Requirements

- Runs in current phone and laptop browsers (Safari on iOS, Chrome on Android, Chrome, Edge and Safari on desktop), opened from a link, with no install or app store.
- Answer on screen within 30 seconds of opening the page with saved settings, on a normal mobile connection.
- Tariff data no older than 24 hours under normal operation.
- No accounts and no personal data stored outside the driver's own browser. Location is used only to find nearby chargers and isn't stored.

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| NDW open data: charging locations (OCPI) feed | Required | Available |
| NDW open data: charging tariffs (OCPI) feed | Required | Available |
| Address search service covering the EU and the US | Required | Available (provider to be chosen in solution design) |
| Free public web hosting reachable by a link | Required | Available |
| Browser location access | Optional | Available (driver permission needed) |

## Out of Scope

- Planning ahead for a destination before the trip (moment 1): fast-follow
- Connections to the Volvo API, ANWB or other card providers: manual input only in v0.1
- Calendar connection and learning from the driver's own history
- Live availability of charging points
- DC fast chargers
- Full electric cars, and comparison with charging at home or at work
- Automatic petrol prices
- Hosting as a claude.ai artifact
- Starting, stopping or paying for a charging session
- Charger results outside the Netherlands (address search does work in the EU and the US)
- Accounts, syncing settings between devices
- Native apps and in-car versions

## Decisions

| ID | Title | Context | Options | Choice | Rationale | Source | FR impact | Consequences |
|----|-------|---------|---------|--------|-----------|--------|-----------|--------------|
| D-1 | Manual input for v0.1 | The Volvo API and ANWB data would give battery level and card fees automatically | Volvo-only with account linking; any brand with manual input; personal tool | Manual input of car, card, petrol and battery values | User: v0.1 is a proof of concept; integrations come later | internal | FR-001, FR-005, FR-012 | Works for any plug-in hybrid brand. Accuracy depends on what the driver enters |
| D-2 | Only "parked here now" | The journey page has two moments: planning ahead and parked here | Both; planning only; parked only | Parked here now only | User reverted an earlier choice for both: the battery level is known once parked | internal | FR-005–FR-008 | Planning ahead moves to fast-follow. No route or arrival battery prediction needed |
| D-3 | Stay from event type | Stay length drives every result and is the one unknown | Type a duration; event type with adjustable typical stay; window only | Event type sets a typical stay, adjustable, and the window is always shown | Tests the "guess from event type" idea without integrations; the window covers a wrong guess | internal | FR-016–FR-018 | Default durations are assumptions to validate (see D-18) |
| D-4 | Petrol price entered by hand | No official open fuel price feed exists in the Netherlands | Manual; national average; nearest station | Manual, remembered | Fits the manual-input approach; scraping price sites is fragile and legally doubtful | internal | FR-001 | The driver must update it when prices change |
| D-5 | Nearest 10 chargers | How many chargers to list around the spot | Fixed 500 m; adjustable radius; nearest 10 | Always the nearest 10 | User choice: simple and never empty | internal | FR-008 | In rural areas the 10th may be far away; the distance is shown |
| D-6 | Rank by saving | Nearest isn't cheapest (Klokgebouw example) | By distance; by saving; by distance with highlight | By saving, biggest first | The product's promise is "worth it or not" | internal | FR-010 | The nearest charger may appear lower in the list |
| D-7 | Ignore live availability | NDW includes live point status | Ignore; label; hide occupied | Ignore in v0.1 | User choice | internal | none | A recommended charger may be occupied; availability labels move to fast-follow |
| D-8 | Current battery entered by hand | Battery level decides the kWh that fit | Arrival %; current % minus trip; assume empty | Current % entered by the driver | Follows from D-2: the driver is already parked | internal | FR-005 | No route data needed |
| D-9 | GPS with address fallback | Where the driver is parked | GPS only; GPS plus address; address only | GPS by default, address search as fallback | One tap normally; works when location is denied and for laptop demos | internal | FR-006, FR-007 | Needs an address search service |
| D-10 | Card fees: start fee and markup | Card providers charge differently | Start fee only; start fee plus markup; plus subscription | Start fee plus optional markup per kWh | Covers most Dutch cards per session without error-prone subscription maths | internal | FR-001, FR-012 | Subscriptions aren't reflected |
| D-11 | Normal web page, not a claude.ai artifact | User wanted easy laptop demos and sharing | claude.ai artifact; normal web page; both | Normal web page on free hosting | Artifacts can't use location or fetch live NDW data or addresses | internal | FR-006, FR-007, FR-019 | Laptop demos via the same link |
| D-12 | Success criteria | How to judge the proof of concept | Accuracy only; accuracy, speed and PM reception; usage | Accuracy, speed and PM reception | Proves the calculation, usability at the charger, and the real goal: PM buy-in | internal | none | Requires 5 real invoices for comparison |
| D-13 | AC chargers only (assumed) | Most plug-in hybrids, including Volvo's, can't use DC fast chargers | AC only; AC and DC | AC only | Listing DC chargers the car can't use would mislead | internal (assumed, please confirm) | FR-008 | Excludes the few plug-in hybrids that support DC |
| D-14 | English user interface (assumed) | The audience is TomTom PMs and the driver | English; Dutch; both | English | Matches the PM audience | internal (assumed, please confirm) | none | Dutch can be added later |
| D-15 | VAT added on top of feed prices (assumed) | The NDW feed often leaves VAT empty; real bills matched price + 21% VAT | Treat as excl. VAT; treat as incl. VAT | Treat feed prices as excluding VAT and add 21% | The E-Flux bill and the Vattenfall price text both matched this | internal (assumed, please confirm) | FR-011 | An operator publishing VAT-inclusive prices would be shown 21% too high; the accuracy metric checks this |
| D-16 | No charging loss | Chargers bill energy before AC charging losses, but the real loss per car is unknown | No loss; fixed 10%; editable default | No loss modelled | User: the loss is unknown, so leave it out | internal | FR-002 (withdrawn), FR-013 | Savings are slightly optimistic (typically 8–12% of the energy cost); the accuracy metric will show whether this matters |
| D-17 | Unknown tariffs listed last (assumed) | Some chargers have no or unreadable tariffs | Hide; list last as "Price unknown" | List last as "Price unknown" | Hiding would make the nearest-10 list look incomplete | internal (assumed, please confirm) | FR-020 | Fewer than 10 comparable chargers may be shown |
| D-18 | Default stays per event type | FR-017 needs concrete durations | Fixed values; driver-defined values | Quick errand 30 min, Shopping 1h30, Café or restaurant 2h, Sports or leisure 2h, Meeting 2h30, Workday 8h, Overnight 12h | Common-sense durations; Shopping and Café or restaurant set by the user in review | internal | FR-017 | Easy to change later |
| D-19 | Stay range and steps (assumed) | Window and stay need limits | Fixed limits; unlimited | Stay 15 min–24 h in 15-minute steps; window in 5-minute steps | Covers a quick stop to a full day; 5-minute window steps read naturally | internal (assumed, please confirm) | FR-016, FR-018 | Stays over 24 h aren't supported |
| D-20 | Setting ranges (assumed) | FR-004 needs testable limits | Fixed ranges; no validation | Ranges listed in FR-004 | Cover all current plug-in hybrids and Dutch price levels with margin, while catching typos | internal (assumed, please confirm) | FR-004 | Unusual cars outside the ranges can't be entered |
| D-21 | Coverage: search anywhere, results in the Netherlands | User asked for EU/US, not just the Netherlands; NDW covers Dutch chargers only | Address search EU/US with NL results; full EU/US coverage; NL only with EU/US later | Address search works in the EU and the US; charger results stay Netherlands-only in v0.1 | A proof of concept needs one well-covered country; other countries lack a free feed like NDW | internal | FR-007, FR-008, FR-021 | EU/US charger coverage moves to "later" |
