module rca4 (
  input  logic [3:0] a,
  input  logic [3:0] b,
  input  logic       cin,
  output logic [3:0] sum,
  output logic       cout
);
  logic c1, c2, c3;

  fa u_fa0 (
    .a    (a[0]),
    .b    (b[0]),
    .cin  (cin),
    .s    (sum[0]),
    .cout (c1)
  );

  fa u_fa1 (
    .a    (a[1]),
    .b    (b[1]),
    .cin  (c1),
    .s    (sum[1]),
    .cout (c2)
  );

  fa u_fa2 (
    .a    (a[2]),
    .b    (b[2]),
    .cin  (c2),
    .s    (sum[2]),
    .cout (c3)
  );

  fa u_fa3 (
    .a    (a[3]),
    .b    (b[3]),
    .cin  (c3),
    .s    (sum[3]),
    .cout (cout)
  );
endmodule
