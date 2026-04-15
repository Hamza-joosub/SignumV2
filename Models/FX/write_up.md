# Findings So Far
1. No cointegration between USD/JPY and the interest rate differential. UIP fails — the carry trade's core variable doesn't anchor the exchange rate in the long run.
2. Cointegration between USD/JPY and the JPY term spread. The long-run anchor is BOJ policy expectations, not current rates. Beta ≈ -0.39, meaning a 1pp steepening of the Japanese curve is associated with ~39% weaker yen in the long run.
3. Error correction works both ways. The exchange rate adjusts at 6.3% per week toward equilibrium (highly significant), and the term spread adjusts at 8.7% per week (significant at 5%). Half-life of about 11 weeks.
4. Asset managers move the exchange rate, not leveraged money. Asset Manager Net Proportion is highly significant (p=0.000), Levered Net Proportion is insignificant (p=0.171). Dealers are significant but they're the passive counterparty.
5. Rate Differential 3M drives short-run movements (p=0.001) even though it doesn't anchor the long run.
6. Positioning structure matters. During 2022-2024 both speculative categories were short yen simultaneously, concentrating all risk on dealers. This one-sided crowding preceded the violent July 2024 unwind. Post-unwind, the market returned to healthier two-sided positioning.
7. Volatility is persistent and fat-tailed. GARCH(1,1) with alpha + beta = 0.96, Student-t with 6.8 degrees of freedom. No asymmetric volatility after accounting for the VECM mean dynamics.
8. VIX is not significant once asset manager positioning and rate differential are controlled for — the risk appetite channel operates through institutional flow, not through a generic equity vol measure.

# Where You Align With the Literature
### UIP failure 
+ completely consistent with decades of research. Meese and Rogoff (1983) showed exchange rate models can't beat a random walk, and the forward premium puzzle is one of the most robust findings in international finance. Your no-cointegration result between the rate differential and USD/JPY is exactly what the literature predicts.
### Volatility persistence and fat tails 
+ standard finding. Bollerslev (1986) onward, every GARCH study on FX finds high persistence and heavy tails. Your alpha + beta = 0.96 and Student-t with ~7 degrees of freedom is textbook.
Carry trade funded at the short end, positioning is structurally short yen 
+ consistent with Brunnermeier, Nagel, and Pedersen (2009) who documented the carry trade's "up the escalator, down the elevator" return profile and the crash risk premium.
# Where You Add Something New
### Term spread as the long-run anchor rather than the rate differential. 
+ This is a genuine contribution. The standard approach tests UIP using the rate differential. You've shown that while the level of rates doesn't cointegrate with USD/JPY, the shape of the Japanese curve does. This connects to Engel and West (2005) who argued that exchange rates reflect expected future fundamentals — the term spread is exactly that, a forward-looking measure. But the specific finding that the term spread cointegrates while the differential doesn't hasn't been widely documented for USD/JPY in this period.
### Asset managers as the price-setting flow. This challenges the conventional narrative. Most of the carry trade literature
+ Galati, Heath, and McGuire (2007), Fong (2010) — focuses on speculative/leveraged money as the key participants. Your finding that leveraged money is insignificant while asset managers drive the rate is a departure. It aligns more with Gabaix and Maggiori (2015) who argue that institutional intermediaries and their balance sheet constraints are central to exchange rate determination, rather than pure speculators.
### Positioning alignment across participant categories as a fragility indicator. 
+ The literature discusses crowded trades conceptually (Brunnermeier and Pedersen, 2009 on liquidity spirals), but the specific decomposition showing that the 2022-2024 period was uniquely dangerous because both speculative categories were on the same side — pushing all risk onto dealers — is original. Most empirical work uses aggregate net positioning.
# Where You Potentially Conflict
### No asymmetric volatility. 
+ This is surprising relative to the literature. Carry trade returns typically show strong negative skewness and asymmetric vol — Burnside et al. (2011) and others have documented this extensively. Your GJR-GARCH found nothing. However, your explanation is reasonable — the VECM mean equation is absorbing the asymmetry through the asset manager positioning variable, which itself responds asymmetrically to risk events. It's not that asymmetry doesn't exist, it's that your mean model captures it before it reaches the residuals.
### VIX insignificance. 
+ Most carry trade studies find VIX significant as a risk factor — Lustig, Roussanov, and Verdelhan (2011) built an entire factor model around global volatility risk. Your finding that it's insignificant once asset manager positioning is controlled for suggests VIX is a proxy for the institutional flow channel rather than an independent driver. That's a defensible interpretation but it's a departure from the mainstream.
# How to Frame the Departures
+ Don't present conflicts as "the literature is wrong." Frame them as: "Our results suggest that aggregate measures of risk appetite (VIX) and speculative positioning (leveraged money) which are standard in the carry trade literature may be proxying for a more direct mechanism — institutional capital reallocation by asset managers. Once this channel is controlled for directly, the aggregate proxies lose significance."

