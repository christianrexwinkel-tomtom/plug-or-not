# PRD: Plug or Not — is charging here worth it? (v0.1 proof of concept)

**Date:** 2026-10-09
**Status:** Draft
**Template version:** default/0.2.1
**References:** User journey page "Worth-It Charging Journey" (https://claude.ai/artifact/QH6WeJ3mzufmZHDaAQ62VW); NDW open data (https://opendata.ndw.nu/): `charging_point_locations_ocpi.json.gz`, `charging_point_tariffs_ocpi.json.gz`; prior art: GE patent CN102529851A
**Plugin version:** 0.5.3
**Agent Sessions:** claude-code: 5d4e9523-19b6-4b26-8e51-d031314dc40e

---

<!-- hint: Keep the body narrative, readable top-to-bottom. Reference-heavy material (decisions log, glossary) belongs in appendices at the end of the document. -->

## TL;DR

Plug or Not is a web page for drivers of plug-in hybrid cars (PHEVs). When they park, it answers one question: is plugging in at a nearby public charger cheaper than driving the same distance on petrol? It lists the 10 nearest chargers, best saving first, and shows for each one how long the driver needs to stay for charging to pay off. Charging prices often mix kWh prices, time fees and start fees, so drivers can't work this out at the charger. One real session cost 11% more than petrol. Version 0.1 is a proof of concept for the Netherlands: the driver enters their car, card and battery details by hand. Planning ahead for a destination, car and card connections, and in-car use come later.

## Overview

- **Purpose**: Let a plug-in hybrid driver who has just parked see, within seconds, which nearby public chargers are cheaper than petrol for their stay, how much they save, and for which stay lengths charging pays off.
- **User Value**: Public charging prices combine energy, time, parking and start fees, and the result depends on the car's charging speed, the room left in the battery and the length of stay. Drivers can't calculate this on the spot and regularly pay more than petrol would have cost. Example: a 4h53 session in Culemborg cost €14.79 for 16.64 kWh, €0.222 per km against €0.200 per km on petrol.
- **Scope**: A web page that runs in phone and laptop browsers, for the moment the driver is parked ("parked here now"), for public AC chargers in the Netherlands. The driver enters car, charge card, petrol price and current battery level by hand. Comparison is against petrol only.

## User Stories

| Story | Description | Priority |
|-------|-------------|----------|
| S1: Set up my car and costs | Enter car, charge card and petrol details once, and have them remembered | P1 |
| S2: See which nearby chargers are worth it | Get the 10 nearest chargers ranked by saving compared with petrol, for my current spot | P1 |
| S3: Tell the app how long I'll stay | Pick an event type that fills in a typical stay, and adjust it | P1 |
| S4: See the worth-it window | See for each charger the range of stay lengths for which charging beats petrol | P1 |
| S5: Use a typed address instead of my location | Search for an address or place when location is unavailable or for a demo | P2 |

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
| Charging loss | Driver doesn't know their car's charging loss | A default of 10% is pre-filled under "Advanced" and can be changed (0–25%) |

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
- **Given** a driver with saved settings is parked on Parkstraat in Nuenen, and the stay is set to 45 minutes
- **When** they allow location, enter a current battery level of 20%, and request the answer
- **Then** they see the 10 nearest public charging locations with an AC charging point, ordered by saving, biggest first
- **And** each entry shows: operator, address, walking distance in metres, price summary, a verdict ("Worth it", "Not worth it for this stay" or "Never worth it"), the saving or extra cost in euros, the cost per km next to the petrol cost per km, the kWh added, and the worth-it window (Story 4)
- **And** with today's tariffs, Vattenfall Parkstraat 21 (74 m) shows "Worth it" with a saving of about €0.19, and the Allego charger at Kerkstraat 6 (charging by the hour) shows "Never worth it"
- **And** the screen states the date and time of the tariff data used

**Scenario 2: Error Path**
- **Given** a driver requests the answer
- **When** the charger and tariff data can't be loaded (no connection, or the data service doesn't respond)
- **Then** the page shows "Couldn't load charger prices. Check your connection and try again." with a "Try again" button, and shows no answer based on partial data

**Scenario 3: Edge Case — battery already full**
- **Given** a driver enters a current battery level of 100%
- **When** they request the answer
- **Then** the page says "Your battery is full, so there's nothing to charge here." and lists no savings

**Scenario 4: Edge Case — time-of-day prices**
- **Given** the nearest charger is E-Flux Het Voorburg 6, Culemborg, with €0.5717/kWh from 16:00 to 22:00 and €0.5417/kWh at other times, plus €0.41/h
- **When** a driver parks there at 15:30 with a stay of 2 hours
- **Then** the cost applies the off-peak price from 15:30 to 16:00 and the peak price from 16:00 to 17:30

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: calculating | Driver requests the answer | A "Finding chargers near you…" state is shown. The answer replaces it, typically within a few seconds |
| Charger without a published tariff | One of the 10 nearest has no tariff in the data | Listed last with "Price unknown". It still counts as one of the 10 |
| Location with different tariffs per point | One location has AC points with different tariffs | Each distinct tariff appears as its own entry, with the same address and distance |
| Charger faster than the car | Charger supports 22 kW, the car 3.6 kW | The car's speed is used |
| Car faster than the charger | Car 11 kW, charger 3.7 kW | The charger's maximum power is used |
| Battery nearly full | Battery 90% of 15 kWh | kWh added stops at the room left in the battery (1.5 kWh plus charging loss); the start fee weighs heavily and the verdict reflects that |
| Only DC fast chargers nearby | No AC charging points among nearby locations | DC-only locations are not listed. The 10 nearest locations with AC points are shown, however far |
| Ties on saving | Two chargers save exactly the same | The nearer one comes first |
| Stale data | Tariff data is more than 48 hours old | The answer is shown with a warning: "Prices may be out of date (last updated <date>)." |
| Location outside the Netherlands | GPS places the driver in Belgium | "Plug or Not currently covers the Netherlands only." No list is shown |

#### Error Handling

| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Charger data can't be loaded | "Couldn't load charger prices. Check your connection and try again." | Shows a "Try again" button. No partial answer |
| Battery level missing or invalid | "Enter your current battery level (0–100%)." | Highlights the field and blocks the request |
| Outside coverage | "Plug or Not currently covers the Netherlands only." | Shows no list. Offers address search (Story 5) |
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
- **Given** the driver picked "Shopping" (45 min)
- **When** they change the stay to 1h15
- **Then** results update to 1h15 and the event type shows as "Shopping (adjusted)"

#### Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Pending: updating | Driver changes the stay | Results update without reloading the page. No spinner for recalculating already-loaded chargers |
| No event type picked | Driver opens the screen and doesn't pick | The stay defaults to "Shopping" (45 min) |
| Overnight across midnight | Driver picks "Overnight" at 21:00 | A 12-hour stay ending at 09:00 the next day, with time-of-day prices applied across midnight |
| Event type list | Driver opens the picker | Options and default stays: Quick errand 30 min, Shopping 45 min, Café or restaurant 1h30, Sports or leisure 2h, Meeting 2h30, Workday 8h, Overnight 12h |

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
- **Then** the entry shows "Worth it if you stay 2h05 to 6h20"
- **And** for Vattenfall Marconilaan 183, Eindhoven (€0.2691/kWh only), it shows "Worth it if you stay at least 40 min"

**Scenario 2: Error Path**
- **Given** a charger whose tariff can't be interpreted
- **When** the driver views the results
- **Then** the entry shows "Price unknown" and no window, instead of a window based on a guess

**Scenario 3: Edge Case — no window**
- **Given** the charger E-Flux Laboratoriumstraat 2, Eindhoven (€0.5417/kWh plus €0.41/h)
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
- **So that** the page works without GPS and for any place in the Netherlands

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

**Scenario 3: Edge Case — no match**
- **Given** a driver types an address
- **When** no place in the Netherlands matches
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
- **FR-002**: System MUST pre-fill a charging loss of 10%, which the driver can change between 0% and 25%.
- **FR-003**: System MUST remember saved settings on the same device and browser between visits, without an account.
- **FR-004**: System MUST validate each setting against its allowed range and block saving until all are valid.
- **FR-005**: System MUST ask for the current battery level (0–100%) on the "parked here now" screen.
- **FR-006**: System MUST use the phone's or laptop's location when the driver allows it.
- **FR-007**: System MUST let the driver search for an address or place in the Netherlands, with up to 5 suggestions, when location is denied, unavailable or approximate, or whenever the driver chooses to.
- **FR-008**: System MUST list the 10 nearest public charging locations that have at least one AC charging point, based on straight-line distance from the chosen spot.
- **FR-009**: System MUST show walking distance in metres for each listed location.
- **FR-010**: System MUST order the list by saving compared with petrol, biggest first; ties go to the nearer location; locations with an unknown price come last.
- **FR-011**: System MUST calculate the cost of a session from the operator's published tariff, including energy, time, parking-after-full and per-session components, applied over the actual stay starting now, including time-of-day price changes. Prices shown include 21% VAT.
- **FR-012**: System MUST add the charge card's start fee and markup per kWh to every session cost.
- **FR-013**: System MUST calculate the energy added as the lower of: charging speed (the lower of the car's and the charger's maximum) × stay, or the room left in the battery from the current battery level, with the charging loss added on top of the energy that reaches the battery.
- **FR-014**: System MUST calculate the petrol cost for the same distance the added energy covers, using the driver's electric consumption, petrol consumption and petrol price.
- **FR-015**: System MUST show for each location: operator, address, walking distance, a short price summary, verdict, saving or extra cost (€), cost per km next to petrol cost per km, kWh added, and the worth-it window.
- **FR-016**: System MUST show the worth-it window as the shortest and longest stay, between 15 minutes and 24 hours in 5-minute steps, for which charging is cheaper than petrol. It must show "at least X" when there's no upper limit, and "Never worth it" when no such stay exists.
- **FR-017**: System MUST offer the event types Quick errand (30 min), Shopping (45 min), Café or restaurant (1h30), Sports or leisure (2h), Meeting (2h30), Workday (8h) and Overnight (12h), each setting the stay to its typical duration.
- **FR-018**: System MUST let the driver adjust the stay between 15 minutes and 24 hours in 15-minute steps, and update all results without reloading.
- **FR-019**: System MUST show the date and time of the tariff data used, and warn when it is more than 48 hours old.
- **FR-020**: System MUST show "Price unknown" with no verdict or window for locations whose tariff is missing or can't be interpreted.
- **FR-021**: System MUST show plain-language messages for: data that can't be loaded, a full battery, location outside the Netherlands, location denied, and no address match (see the story error tables).
- **FR-022**: System SHOULD remember the last used event type and use it as the default next time.
- **FR-023**: System SHOULD show a separate entry for each distinct AC tariff at a location.
- **FR-024**: System MAY let the driver re-run the answer with one tap after changing battery level or stay, without re-entering the location.

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
| v1 (v0.1 proof of concept) | S1–S5; FR-001–FR-021 | The smallest cut that answers "is it worth plugging in here?" end to end, with real NDW tariffs, for demos and the driver's own sessions |
| fast-follow | FR-022–FR-024; planning ahead for a destination (moment 1 from the journey page); live availability labels | Convenience and the second journey moment, both reusing the same calculation |
| later | Stay estimate from calendar and own history; battery level from the Volvo API; charge card details from the card provider; Android Automotive in-car version; worth-it colouring in navigation; full electric cars (comparison against other chargers); vehicle integration (possible IP, discussed separately) | Each needs an outside integration or partner, which the proof of concept should validate first |

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
| Address search service covering the Netherlands (e.g. PDOK Locatieserver) | Required | Available |
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
- Countries other than the Netherlands
- Accounts, syncing settings between devices
- Native apps and in-car versions

## Decisions

| ID | Title | Context | Options | Choice | Rationale | Source | FR impact | Consequences |
|----|-------|---------|---------|--------|-----------|--------|-----------|--------------|
| D-1 | Manual input for v0.1 | The Volvo API and ANWB data would give battery level and card fees automatically | Volvo-only with account linking; any brand with manual input; personal tool | Manual input of car, card, petrol and battery values | User: v0.1 is a proof of concept; integrations come later | internal | FR-001, FR-005, FR-012 | Works for any plug-in hybrid brand. Accuracy depends on what the driver enters |
| D-2 | Only "parked here now" | The journey page has two moments: planning ahead and parked here | Both; planning only; parked only | Parked here now only | User reverted an earlier choice for both: the battery level is known once parked | internal | FR-005–FR-008 | Planning ahead moves to fast-follow. No route or arrival battery prediction needed |
| D-3 | Stay from event type | Stay length drives every result and is the one unknown | Type a duration; event type with adjustable typical stay; window only | Event type sets a typical stay, adjustable, and the window is always shown | Tests the "guess from event type" idea without integrations; the window covers a wrong guess | internal | FR-016–FR-018 | Default durations are assumptions to validate (see D-18) |
| D-4 | Petrol price entered by hand | No official open fuel price feed exists in the Netherlands | Manual; national average; nearest station | Manual, remembered | Fits the manual-input approach; scraping price sites is fragile and legally doubtful | internal | FR-001 | The driver must update it when prices change |
| D-5 | Nearest 10 chargers | How many chargers to list around the spot | Fixed 500 m; adjustable radius; nearest 10 | Always the nearest 10 | User choice: simple and never empty | internal | FR-008 | In rural areas the 10th may be far away; walking distance is shown |
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
| D-16 | 10% default charging loss (assumed) | Chargers bill energy before AC charging losses | No loss; fixed 10%; editable default | Editable, default 10% | Typical AC loss is 8–12% | internal (assumed, please confirm) | FR-002, FR-013 | Drivers rarely know their exact loss |
| D-17 | Unknown tariffs listed last (assumed) | Some chargers have no or unreadable tariffs | Hide; list last as "Price unknown" | List last as "Price unknown" | Hiding would make the nearest-10 list look incomplete | internal (assumed, please confirm) | FR-020 | Fewer than 10 comparable chargers may be shown |
| D-18 | Default stays per event type (assumed) | FR-017 needs concrete durations | Fixed values; driver-defined values | Quick errand 30 min, Shopping 45 min, Café or restaurant 1h30, Sports or leisure 2h, Meeting 2h30, Workday 8h, Overnight 12h | Common-sense durations to validate in use | internal (assumed, please confirm) | FR-017 | Easy to change later |
| D-19 | Stay range and steps (assumed) | Window and stay need limits | Fixed limits; unlimited | Stay 15 min–24 h in 15-minute steps; window in 5-minute steps | Covers a quick stop to a full day; 5-minute window steps read naturally | internal (assumed, please confirm) | FR-016, FR-018 | Stays over 24 h aren't supported |
