export type AlertOp = ">=" | "<=" | ">" | "<"

export interface AlertCondition {
  indicator: "PRICE"
  op: AlertOp
  value: number
}

export function evalAlertCondition(condition: AlertCondition, last: number): boolean {
  const { op, value } = condition
  if (op === ">=") return last >= value
  if (op === "<=") return last <= value
  if (op === ">") return last > value
  if (op === "<") return last < value
  return false
}
