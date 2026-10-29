(* keep_hierarchy *)
module mux2 (
  input  logic d0,
  input  logic d1,
  input  logic sel,
  output logic y
);
  always_comb begin
    y = sel ? d1 : d0;
  end
endmodule
