# Card repayments become transfers from a start month

Until now, credit-card spending was tracked by logging each card repayment under the "Card de credit" category, which counted as an expense. Statement import will bring in the individual card purchases, so counting the repayment too would count the same money twice. From a chosen start month, card repayments are treated as transfers (neither spending nor income) and the imported purchases are the expenses. Repayments logged before that month stay as expenses, because the purchases behind them were never recorded.

## Considered Options

- **Reclassify all history as transfers:** Past monthly spending would drop, because nothing would replace the repayments.
- **Keep repayments as spending and skip importing card purchases:** No per-purchase detail or categories for card spending.

## Consequences

Spending totals that span the start month mix the two methods, so a month just before it and a month just after it aren't measured the same way.
