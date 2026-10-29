module tb_csla4;
  logic [3:0] a, b;
  logic cin;
  logic [3:0] sum_csla, sum_rca;
  logic cout_csla, cout_rca;

  csla4 u_csla (
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum_csla),
    .cout(cout_csla)
  );

  rca4 u_rca (
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum_rca),
    .cout(cout_rca)
  );

  int errors;
  int checked;

  initial begin
    errors = 0;
    checked = 0;

    for (int i_cin = 0; i_cin < 2; i_cin++) begin
      for (int i_b = 0; i_b < 16; i_b++) begin
        for (int i_a = 0; i_a < 16; i_a++) begin
          a = 4'(i_a);
          b = 4'(i_b);
          cin = 1'(i_cin);
          #1;

          begin
            logic [4:0] expected;
            expected = 5'(a) + 5'(b) + 5'(cin);

            if ({cout_csla, sum_csla} !== expected) begin
              $display("ERROR CSLA: a=%0d b=%0d cin=%0d exp=%0h got=%0h", a, b, cin, expected, {cout_csla, sum_csla});
              errors++;
            end

            if ({cout_rca, sum_rca} !== expected) begin
              $display("ERROR RCA: a=%0d b=%0d cin=%0d exp=%0h got=%0h", a, b, cin, expected, {cout_rca, sum_rca});
              errors++;
            end

            checked++;
          end
        end
      end
    end

    if (errors == 0) begin
      $display("RESULT unit_csla4 PASS checked=%0d errors=%0d", checked, errors);
    end else begin
      $display("RESULT unit_csla4 FAIL checked=%0d errors=%0d", checked, errors);
      $fatal(1, "tb_csla4 failed with errors");
    end
    $finish;
  end
endmodule
