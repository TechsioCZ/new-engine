export type Extends<Candidate, Contract> = [Candidate] extends [Contract]
  ? true
  : false

export type ExpectFalse<Condition extends false> = Condition
