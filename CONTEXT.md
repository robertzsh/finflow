# FinFlow

Personal finances for one household of exactly two people: what they earn, spend, save and invest, and who paid for what.

## Language

### People

**Household**:
The two people who share one set of books. There is only ever one, with exactly two members.
_Avoid_: Family, team, account

**Member**:
One of the two people in the household.
_Avoid_: User, profile, partner

**Payer**:
Who a transaction belongs to: one member, or Split. It is about who paid, not who typed the transaction in.
_Avoid_: Created by, entered by, owner

**Split**:
A payer meaning the amount belongs half to each member.
_Avoid_: Everyone, shared, joint

**Settle-up**:
How much one member owes the other once each member's spending is compared with their fair half.
_Avoid_: Balance, debt

### Money in and out

**Transaction**:
A single expense or income with a date, an amount, a category and a payer.
_Avoid_: Entry, record, payment

**Transfer**:
Money moving between the household's own bank accounts. It is neither spending nor income.
_Avoid_: Internal payment, top-up

**Card repayment**:
Paying off a credit card from another account. It is a transfer; the card purchases themselves are the expenses.
_Avoid_: Card de credit expense

**Category**:
What a transaction was for, such as Groceries or Rent. A sub-category narrows a category, such as a specific store under Groceries.
_Avoid_: Tag, type

**Standing income**:
A member's fixed monthly income (Salary and Bonuri). It appears once per member per month without being entered by hand.
_Avoid_: Recurring income

**Bonuri**:
Monthly meal vouchers received as part of pay.
_Avoid_: Vouchers, tickets

**Recurring bill**:
An expense that repeats on a schedule, such as rent, a subscription or a utility.
_Avoid_: Subscription (when meaning all bills), standing order

**Variable bill**:
A recurring bill whose amount changes each time, so it has to be confirmed before it is posted.
_Avoid_: Estimated bill

**Auto-posted transaction**:
A transaction the app created from a recurring bill once its date passed.
_Avoid_: Generated transaction, copy

### Accounts and imports

**Bank account**:
A real account at ING, BRD or Revolut. It belongs to one member or is joint, and its transactions default to that payer (a joint account's to Split).
_Avoid_: Card, wallet

**Statement import**:
Bringing a bank account's exported statement into FinFlow, where each row is reviewed before it is saved.
_Avoid_: Sync, upload

**Suggested match**:
A statement row that looks like a transaction already entered by hand (same amount, a few days apart, similar merchant). A member confirms or rejects it; it is never merged silently.
_Avoid_: Duplicate, auto-merge

### Planning

**Base currency**:
The currency all totals are shown in: RON (lei).
_Avoid_: Default currency, home currency

**Exchange rate**:
How many lei one unit of a foreign currency is worth, on a given day.
_Avoid_: FX, conversion

**Opening balance**:
A member's money on hand at the point FinFlow starts counting.
_Avoid_: Starting balance, initial amount

**Budget**:
A monthly spending limit for one category.
_Avoid_: Cap, allowance

**Goal**:
Something the household is saving toward, with a target amount.
_Avoid_: Savings pot, target

**Contribution**:
Money added toward a goal on a given day.
_Avoid_: Deposit, payment

**Monthly review**:
A look back at one finished month: what came in, what went out, how budgets went and who owes whom.
_Avoid_: Report, statement
