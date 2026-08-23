# Bracket operations

Bracket syntax is `[start:step:stop]unit` and may be used anywhere a SPICE numeric value is accepted:

```spice
R1 1 0 [0:2:10]k
C1 1 0 [0.1:0.2:1]u
```

Operands may carry their own suffixes. They are normalized independently, so `[0u:1m:2m]` is interpreted in base units. A zero step, wrong-direction range, non-finite value, or range larger than 1,000 points is rejected before expansion.

Only the first bracket operation is expanded. Other bracket expressions remain literal text in each generated netlist. Simulations run in correlated, session-scoped workers; timed-out workers are replaced and late responses are ignored.

Completed sweep items are plotted progressively. The final aggregate is ordered by parameter index, and failed items do not prevent successful items from appearing. The configured maximum worker count applies to the next idle simulation session.

The plot preserves zoom and pan while the ordered result schema is unchanged (X-axis variable plus output variable names). A schema change resets the view and refreshes the full-data pan bounds.
