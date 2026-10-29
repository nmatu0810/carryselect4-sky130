module csla4 (
  input  logic [3:0] a,
  input  logic [3:0] b,
  input  logic       cin,
  output logic [3:0] sum,
  output logic       cout
);
  logic       c2;
  logic [1:0] s_hi0;
  logic       co_hi0;
  logic [1:0] s_hi1;
  logic       co_hi1;

  rca2 u_low (
    .a    (a[1:0]),
    .b    (b[1:0]),
    .cin  (cin),
    .s    (sum[1:0]),
    .cout (c2)
  );

  rca2 u_hi0 (
    .a    (a[3:2]),
    .b    (b[3:2]),
    .cin  (1'b0),
    .s    (s_hi0),
    .cout (co_hi0)
  );

  rca2 u_hi1 (
    .a    (a[3:2]),
    .b    (b[3:2]),
    .cin  (1'b1),
    .s    (s_hi1),
    .cout (co_hi1)
  );

  mux2 u_mux_s2 (
    .d0  (s_hi0[0]),
    .d1  (s_hi1[0]),
    .sel (c2),
    .y   (sum[2])
  );

  mux2 u_mux_s3 (
    .d0  (s_hi0[1]),
    .d1  (s_hi1[1]),
    .sel (c2),
    .y   (sum[3])
  );

  mux2 u_mux_co (
    .d0  (co_hi0),
    .d1  (co_hi1),
    .sel (c2),
    .y   (cout)
  );
endmodule
