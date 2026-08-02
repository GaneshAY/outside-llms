**FestFit** connects to Spotify (or a quick quiz) to learn your music taste, matches it against a festival's real lineup, and builds you a personalized, conflict-free itinerary — plus a discovery playlist and social features to go with friends.

## **Core problem it solves**

* Festival lineups have 100+ artists across multiple stages/days with no easy way to know who's worth your time.[sidebench](https://sidebench.com/music-festivals-using-tech/)  
* Existing tools like Instafest only show taste-overlap, not an actionable schedule, and require a Spotify account.instafest+1  
* Discovery is broken — fans miss breakout artists with no easy way to preview them before showtime.[instafest](https://www.instafest.app/)

## **Build-for-real features (hackathon scope)**

| Feature | Description |
| ----- | ----- |
| Spotify connect | OAuth pulls top artists/genres for instant taste profile [reddit](https://www.reddit.com/r/spotify/comments/iarvpv/ive_made_a_website_that_matches_your_spotify/) |
| Quiz fallback | Genre/famous-artist picker for users without Spotify, feeding the same matching engine aman+1 |
| 3 schedule options | Auto-generated itinerary picks to choose from, based on taste-match strength |
| Itinerary rearranging | Swap in artists you want to explore, resolve set-time conflicts |
| Discovery playlist | Pushes a "New to You" Spotify playlist of unheard lineup artists matching your taste [newsroom.spotify](https://newsroom.spotify.com/2026-05-05/acl-festival-personalized-experience/) |
| Basic sharing | Share itinerary link with friends |
| Friend-based group planning | Match itineraries with people you already know, plan to go together |
| Scripted AI chatbot | Narrow "who should I see next" discovery assistant, not fully open-ended |
| Basic logistics | Static walk-time estimates between stages, no live navigation |

## **Pitch-only / roadmap features (not built live)**

* **Stranger matching**: Find people with similar taste/itinerary and meet up — pitched as "Phase 2" once verification and safety infrastructure (public meet defaults, ID checks) are added.about.dateid+1  
* **Artist-to-fan updates**: Artists messaging matched fans directly, framed as strictly opt-in given real consent/privacy requirements around fan data.get.even+1

## **Future use (explicitly roadmap, not demo)**

* **Crowd heatmap**: Real-time density mapping needs festival-installed sensor infrastructure (BLE beacons, Wi-Fi triangulation, video analytics) that a hackathon team can't access — positioned as a future integration once partnered with a festival's ops team.isarsoft+2  
* **Local event scraper**: Extends FestFit beyond one festival by scraping local music events year-round and curating them with the same taste-matching logic, turning a once-a-year tool into an always-on product.

## **Business model**

| Revenue stream | Description |
| :---: | :---: |

| Revenue stream | Description |
| ----- | ----- |
| Festival B2B licensing | White-label itinerary tool sold to organizers [guidebook](https://www.guidebook.com/post/which-event-app-features-can-be-monetized) |
| Sponsor placements | Tiered sponsor packages inside itinerary/discovery flows [guidebook](https://www.guidebook.com/post/which-event-app-features-can-be-monetized) |
| Artist/label partnerships | Paid discovery-playlist placement for artists |
| Premium consumer tier | Multi-festival planning, group sync, offline maps |

## **Market timing**

* Spotify itself validated this exact space in May 2026, launching personalized lineup matching with ACL Music Fest.[newsroom.spotify](https://newsroom.spotify.com/2026-05-05/acl-festival-personalized-experience/)  
* The global music festival market is worth roughly $3.55–4.6 billion in 2026, growing 17–23% annually.thebusinessresearchcompany+1  
* U.S. music tourism is a $70.6 billion market in 2026, showing fans already spend heavily — personalization reduces decision fatigue and boosts satisfaction.[grandviewresearch](https://www.grandviewresearch.com/industry-analysis/us-music-tourism-market-report)

## **Demo flow (for judges)**

1. Connect Spotify (or quiz) → show taste profile.  
2. Reveal 3 schedule options, rearrange one live.  
3. Show conflict resolution in action.  
4. Pull up discovery playlist as the "wow" close.[outsidellms.devpost](https://outsidellms.devpost.com/rules)  
5. Close with roadmap slide: heatmap \+ local scraper as vision for post-hackathon growth.

This scoping keeps your live demo tight, technically credible, and safe, while the roadmap features (heatmap, scraper, stranger-matching) show judges you're thinking beyond a one-day build without risking demo failure.

