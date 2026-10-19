
Per-image results at confidence 0.30

| Image | Visible | Detected | Correct | False pos. | Time (s) | Note |
|---|---|---|---|---|---|---|
| frame01.jpg | 4 | 3 | 3 | 0 | 0.139 | Two people clear, two cut off at the left and right edges |
| frame02.jpg | 2 | 2 | 2 | 0 | 0.113 | Two people in close-up, blurred crowd behind not counted |
| frame03.jpg | 1 | 1 | 1 | 0 | 0.152 | Single portrait with space suit |
| frame04.jpg | 1 | 1 | 1 | 0 | 0.160 | Single portrait, head and shoulders |
| frame05.jpg | 4 | 4 | 4 | 0 | 0.111 | Frame 1 darkened, low light |
| frame06.jpg | 2 | 2 | 2 | 0 | 0.090 | Frame 2 darkened, low light |
| frame07.jpg | 4 | 3 | 3 | 0 | 0.128 | Frame 1 shrunk to 178 px wide, people small like in a far camera |
| frame08.jpg | 1 | 1 | 1 | 0 | 0.166 | Frame 2 cropped, second person reduced to a sliver of sleeve |
| frame09.jpg | 3 | 3 | 3 | 0 | 0.091 | Frame 1 cropped, one person cut off at the left edge |
| frame10.jpg | 0 | 0 | 0 | 0 | 0.120 | Cat, no people |
| frame11.jpg | 0 | 0 | 0 | 0 | 0.120 | Coffee cup, no people |
| frame12.jpg | 0 | 0 | 0 | 0 | 0.110 | Motorcycle in a garage, no people |

| Metric | Result | Target | Status |
|---|---|---|---|
| Detection accuracy | 90.9% (20/22) | >= 85% | pass |
| False positives | 0.0% (0/20) | <= 10% | pass |
| Average inference time | 0.125 s | <= 1.5 s | pass |
| Average confidence | 0.782 | >= 0.7 | pass |
| System reliability | 100.0% | 100% | pass |

False positives and correct counts are reviewed (checked by eye on the overlay images).

Threshold comparison (count-based estimate, no manual review)

| Confidence | Detected | Est. accuracy | Est. false pos. | Avg confidence | Avg time (s) |
|---|---|---|---|---|---|
| 0.25 | 21 | 95.5% | 0.0% | 0.758 | 0.109 |
| 0.30 | 20 | 90.9% | 0.0% | 0.782 | 0.117 |
| 0.40 | 19 | 86.4% | 0.0% | 0.806 | 0.113 |
| 0.50 | 18 | 81.8% | 0.0% | 0.828 | 0.108 |
| 0.60 | 18 | 81.8% | 0.0% | 0.828 | 0.118 |
| 0.70 | 17 | 77.3% | 0.0% | 0.835 | 0.124 |
