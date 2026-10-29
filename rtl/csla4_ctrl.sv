module csla4_ctrl (
  input  logic clk,
  input  logic rst_n,
  input  logic valid_in,
  output logic ready_out,
  output logic valid_out,
  output logic ld_en,
  output logic out_en
);
  localparam logic [1:0] S_IDLE    = 2'b00;
  localparam logic [1:0] S_COMPUTE = 2'b01;
  localparam logic [1:0] S_DONE    = 2'b10;

  (* fsm_encoding = "none" *)
  logic [1:0] state;
  logic [1:0] state_next;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state <= S_IDLE;
    end else begin
      state <= state_next;
    end
  end

  always_comb begin
    case (state)
      S_IDLE: begin
        state_next = valid_in ? S_COMPUTE : S_IDLE;
      end
      S_COMPUTE: begin
        state_next = S_DONE;
      end
      S_DONE: begin
        state_next = valid_in ? S_COMPUTE : S_IDLE;
      end
      default: begin
        state_next = S_IDLE;
      end
    endcase
  end

  assign ready_out = (state == S_IDLE) | (state == S_DONE);
  assign valid_out = (state == S_DONE);
  assign out_en    = (state == S_COMPUTE);
  assign ld_en     = valid_in & ready_out;

endmodule
