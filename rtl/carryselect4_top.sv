module carryselect4_top (
  input  logic       clk,
  input  logic       rst_n,
  input  logic       valid_in,
  input  logic [8:0] data_in,      // {cin, b[3:0], a[3:0]}: a=data_in[3:0], b=data_in[7:4], cin=data_in[8]
  output logic       ready_out,
  output logic       valid_out,
  output logic [4:0] data_out      // {cout, sum[3:0]} = a + b + cin
);
  logic ld_en;
  logic out_en;
  logic [3:0] sum_comb;
  logic cout_comb;

  logic [3:0] a_q;
  logic [3:0] b_q;
  logic       cin_q;
  logic [3:0] sum_q;
  logic       cout_q;

  // Input bank: 9 FFs with asynchronous reset to 0, loaded on ld_en
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      a_q   <= 4'b0;
      b_q   <= 4'b0;
      cin_q <= 1'b0;
    end else if (ld_en) begin
      a_q   <= data_in[3:0];
      b_q   <= data_in[7:4];
      cin_q <= data_in[8];
    end
  end

  // Output bank: 5 FFs with asynchronous reset to 0, loaded on out_en
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sum_q  <= 4'b0;
      cout_q <= 1'b0;
    end else if (out_en) begin
      sum_q  <= sum_comb;
      cout_q <= cout_comb;
    end
  end

  csla4_ctrl u_ctrl (
    .clk       (clk),
    .rst_n     (rst_n),
    .valid_in  (valid_in),
    .ready_out (ready_out),
    .valid_out (valid_out),
    .ld_en     (ld_en),
    .out_en    (out_en)
  );

  csla4 u_csla (
    .a    (a_q),
    .b    (b_q),
    .cin  (cin_q),
    .sum  (sum_comb),
    .cout (cout_comb)
  );

  assign data_out = {cout_q, sum_q};

endmodule
