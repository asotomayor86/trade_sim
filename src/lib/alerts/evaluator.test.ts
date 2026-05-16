import { describe, it, expect } from "vitest"
import { evalAlertCondition, type AlertCondition } from "./evaluator"

function cond(op: AlertCondition["op"], value: number): AlertCondition {
  return { indicator: "PRICE", op, value }
}

describe("evalAlertCondition", () => {
  describe("operador >=", () => {
    it("true cuando last === value", () => expect(evalAlertCondition(cond(">=", 100), 100)).toBe(true))
    it("true cuando last > value",  () => expect(evalAlertCondition(cond(">=", 100), 101)).toBe(true))
    it("false cuando last < value", () => expect(evalAlertCondition(cond(">=", 100),  99)).toBe(false))
  })

  describe("operador <=", () => {
    it("true cuando last === value", () => expect(evalAlertCondition(cond("<=", 100), 100)).toBe(true))
    it("true cuando last < value",  () => expect(evalAlertCondition(cond("<=", 100),  99)).toBe(true))
    it("false cuando last > value", () => expect(evalAlertCondition(cond("<=", 100), 101)).toBe(false))
  })

  describe("operador >", () => {
    it("false cuando last === value", () => expect(evalAlertCondition(cond(">", 100), 100)).toBe(false))
    it("true cuando last > value",   () => expect(evalAlertCondition(cond(">", 100), 100.01)).toBe(true))
    it("false cuando last < value",  () => expect(evalAlertCondition(cond(">", 100),  99.99)).toBe(false))
  })

  describe("operador <", () => {
    it("false cuando last === value", () => expect(evalAlertCondition(cond("<", 100), 100)).toBe(false))
    it("true cuando last < value",   () => expect(evalAlertCondition(cond("<", 100),  99.99)).toBe(true))
    it("false cuando last > value",  () => expect(evalAlertCondition(cond("<", 100), 100.01)).toBe(false))
  })

  it("funciona con precios decimales", () => {
    expect(evalAlertCondition(cond(">=", 152.75), 152.75)).toBe(true)
    expect(evalAlertCondition(cond("<=", 0.001),   0.001)).toBe(true)
  })
})
