module tb_top;
  logic       clk;
  logic       rst_n;
  logic       valid_in;
  logic [8:0] data_in;
  logic       ready_out;
  logic       valid_out;
  logic [4:0] data_out;

  // DUT instantiation
  carryselect4_top dut (
    .clk       (clk),
    .rst_n     (rst_n),
    .valid_in  (valid_in),
    .data_in   (data_in),
    .ready_out (ready_out),
    .valid_out (valid_out),
    .data_out  (data_out)
  );

  // Scoreboard item structure
  typedef struct {
    logic [4:0] exp;
    int         accept_cycle;
  } sb_entry_t;

  sb_entry_t sb_q[$];

  // Tracking counters and driver variables
  int         cycle = 0;
  int         n_checked = 0;
  int         n_accepted = 0;
  int         n_sent = 0;
  int         n_err = 0;
  logic [4:0] cur_exp = '0;

  // 10 ns clock generation (period = 10 ns)
  initial begin
    clk = 0;
    forever #5 clk = ~clk;
  end

  // Global watchdog: 20000 cycles
  initial begin
    repeat (20000) @(posedge clk);
    $fatal(1, "timeout: watchdog expired after 20000 cycles");
  end

  // Monitor process: runs strictly on @(posedge clk)
  always @(posedge clk) begin
    if (rst_n) begin
      // 1) cycle++
      cycle++;

      // 2) Check valid_out
      if (valid_out) begin
        if (sb_q.size() == 0) begin
          $display("ERROR [cycle %0d]: spurious valid_out=1 when scoreboard is empty! data_out=%0h", cycle, data_out);
          n_err++;
        end else begin
          sb_entry_t item;
          int latency;
          item = sb_q.pop_front();
          latency = cycle - item.accept_cycle;

          if (data_out !== item.exp) begin
            $display("ERROR [cycle %0d]: data mismatch! exp=%0h got=%0h", cycle, item.exp, data_out);
            n_err++;
          end

          if (latency != 2) begin
            $display("ERROR [cycle %0d]: latency mismatch! exp=2 got=%0d (accepted at cycle %0d)", cycle, latency, item.accept_cycle);
            n_err++;
          end

          n_checked++;
        end
      end

      // 3) Sample valid_in && ready_out (handshake accepted)
      if (valid_in && ready_out) begin
        sb_entry_t new_item;
        new_item.exp = cur_exp;
        new_item.accept_cycle = cycle;
        sb_q.push_back(new_item);
        n_accepted++;
      end
    end
  end

  // Driver task: reset sequence
  task automatic drive_reset();
    // Inputs change only at negedge (initial values at t=0 precede any clock edge)
    if ($time != 0) @(negedge clk);
    rst_n    = 1'b0;
    valid_in = 1'b0;
    data_in  = '0;
    cur_exp  = '0;
    repeat (3) @(negedge clk);
    rst_n    = 1'b1;
    @(negedge clk);
  endtask

  // Driver task: send transaction
  task automatic send(input logic [8:0] din, input logic [4:0] exp);
    @(negedge clk);
    data_in  = din;
    valid_in = 1'b1;
    cur_exp  = exp;
    // ready_out is a function of the FSM state only, which changes only at posedge,
    // so its value at negedge is exactly what the next posedge samples (no race).
    while (!ready_out) @(negedge clk);
    @(posedge clk);  // acceptance edge k; the monitor pushes the scoreboard entry
    n_sent++;
  endtask

  // Driver task: n cycles with valid_in = 0 after an acceptance edge (n >= 1)
  task automatic idle(input int n);
    @(negedge clk);
    valid_in = 1'b0;
    repeat (n - 1) @(negedge clk);
  endtask

  // Completion check task
  task automatic finish_test(string name);
    int timeout = 0;
    while (sb_q.size() > 0 && timeout < 50) begin
      @(posedge clk);
      timeout++;
    end

    // Drain: a few extra cycles so a late spurious valid_out is still caught by the monitor
    repeat (3) @(posedge clk);

    if (sb_q.size() > 0) begin
      $display("ERROR %s: scoreboard not empty after %0d cycles (remaining: %0d)", name, timeout, sb_q.size());
      n_err += sb_q.size();
    end

    if (n_checked != n_sent || n_accepted != n_sent) begin
      $display("ERROR %s: count mismatch sent=%0d accepted=%0d checked=%0d", name, n_sent, n_accepted, n_checked);
      n_err++;
    end

    if (n_err == 0) begin
      $display("RESULT %s PASS checked=%0d errors=0", name, n_checked);
    end else begin
      $display("RESULT %s FAIL checked=%0d errors=%0d", name, n_checked, n_err);
      $fatal(1, "Test %s failed with %0d errors", name, n_err);
    end
  endtask

  // Case 1 test sequence
  task automatic run_case1();
    logic [13:0] mem [0:5];
    int n_max = 0;   // (15,15,1) -> 5'h1F
    int n_cout = 0;  // (15,1,0)  -> cout == 1
    $readmemh("verif/vectors/case1.hex", mem);
    drive_reset();

    for (int i = 0; i < 6; i++) begin
      logic [8:0] din;
      logic [4:0] exp;
      if ($isunknown(mem[i])) $fatal(1, "case1.hex: entry %0d is X/missing", i);
      din = mem[i][13:5];
      exp = mem[i][4:0];

      // Explicit expectations required by the plan (the scoreboard then checks DUT against them)
      if (din == 9'h1FF) begin
        if (exp !== 5'h1F) $fatal(1, "case1.hex: (15,15,1) must expect 5'h1F, got %0h", exp);
        n_max++;
      end
      if (din == 9'h01F) begin
        if (exp[4] !== 1'b1) $fatal(1, "case1.hex: (15,1,0) must expect cout=1, got %0h", exp);
        n_cout++;
      end

      send(din, exp);
      idle(2);  // between transactions: 2 cycles with valid_in = 0
    end
    if (n_max != 1 || n_cout != 1) $fatal(1, "case1.hex lacks (15,15,1)/(15,1,0): %0d/%0d", n_max, n_cout);

    finish_test("case1");
  endtask

  // Case 5 test sequence (exhaustive)
  task automatic run_case5();
    logic [13:0] mem [0:511];
    $readmemh("verif/vectors/exhaustive.hex", mem);
    drive_reset();

    for (int i = 0; i < 512; i++) begin
      logic [8:0] din;
      logic [4:0] exp;
      if ($isunknown(mem[i])) $fatal(1, "exhaustive.hex: entry %0d is X/missing", i);
      din = mem[i][13:5];
      exp = mem[i][4:0];

      send(din, exp);
      idle(1);  // between transactions: 1 cycle with valid_in = 0
    end

    finish_test("case5");
  endtask

  // Main test dispatch
  initial begin
    string test_name;
    if (!$value$plusargs("TEST=%s", test_name)) begin
      test_name = "case1";
    end

    $dumpfile({"verif/out/", test_name, ".vcd"});
    $dumpvars(0, tb_top);

    case (test_name)
      "case1": run_case1();
      "case5": run_case5();
      default: $fatal(1, "unknown test %s", test_name);
    endcase

    $finish;
  end

endmodule
