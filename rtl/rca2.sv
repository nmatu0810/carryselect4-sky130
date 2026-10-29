module rca2 (
  input  logic [1:0] a,
  input  logic [1:0] b,
  input  logic       cin,
  output logic [1:0] s,
  output logic       cout
);
  logic c1;

  fa u_fa0 (
    .a    (a[0]),
    .b    (b[0]),
    .cin  (cin),
    .s    (s[0]),
    .cout (c1)
  );

  fa u_fa1 (
    .a    (a[1]),
    .b    (b[1]),
    .cin  (c1),
    .s    (s[1]),
    .cout (cout)
  );
endmodule
