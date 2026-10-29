(* keep_hierarchy *)
module fa (
  input  logic a,
  input  logic b,
  input  logic cin,
  output logic s,
  output logic cout
);
  always_comb begin
    s    = a ^ b ^ cin;
    cout = (a & b) | (b & cin) | (a & cin);
  end
endmodule
