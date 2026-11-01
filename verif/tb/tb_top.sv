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

  // Extra monitor state (Task 5)
  logic [4:0] prev_data;                 // data_out sampled at the previous posedge
  bit         have_prev = 1'b0;
  int         last_accept = -1;          // accept_cycle of the previous acceptance
  int         first_accept = -1;
  int         last_result = -1;          // cycle of the most recent valid_out
  int         lat_min = 1000000;
  int         lat_max = -1;
  bit         chk_gap = 1'b0;            // case2: consecutive acceptances must be exactly 2 cycles apart

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

      // 1b) data_out must hold: it may only change on the edge where valid_out is sampled 1
      if (have_prev && !valid_out && data_out !== prev_data) begin
        $display("ERROR [cycle %0d]: data_out changed without valid_out! prev=%0h now=%0h", cycle, prev_data, data_out);
        n_err++;
      end
      prev_data = data_out;
      have_prev = 1'b1;

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

          if (latency < lat_min) lat_min = latency;
          if (latency > lat_max) lat_max = latency;
          last_result = cycle;
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
        if (chk_gap && last_accept >= 0 && (cycle - last_accept) != 2) begin
          $display("ERROR [cycle %0d]: acceptance gap %0d != 2 (previous at cycle %0d)", cycle, cycle - last_accept, last_accept);
          n_err++;
        end
        if (first_accept < 0) first_accept = cycle;
        last_accept = cycle;
      end
    end else begin
      // Reset cycles are skipped; forget history so reset does not look like a data_out change
      have_prev   = 1'b0;
      last_accept = -1;
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


  // ---------------------------------------------------------------------------
  // Task 5 helpers
  // ---------------------------------------------------------------------------

  // Direct comparison of the three DUT outputs (used #1 after an async reset edge)
  task automatic check_out(string tag, logic exp_v, logic exp_r, logic [4:0] exp_d);
    if (valid_out !== exp_v || ready_out !== exp_r || data_out !== exp_d) begin
      $display("ERROR %s: outputs valid=%b ready=%b data=%0h, expected valid=%b ready=%b data=%0h",
               tag, valid_out, ready_out, data_out, exp_v, exp_r, exp_d);
      n_err++;
    end
  endtask

  // Drop transactions that were cancelled by a reset: clear sb_q and un-count them
  task automatic cancel_pending(string tag, int expect_n);
    int n;
    n = sb_q.size();
    if (n != expect_n) begin
      $display("ERROR %s: %0d pending transactions at reset, expected %0d", tag, n, expect_n);
      n_err++;
    end
    n_sent     -= n;
    n_accepted -= n;
    sb_q.delete();
  endtask

  // Called right at a posedge. rst_n=0 at +3 ns, outputs checked 1 ns later,
  // rst_n=1 at +4 ns of the following cycle.
  task automatic async_reset_pulse(string tag, logic pre_valid, int expect_cancel);
    #3;
    if (valid_out !== pre_valid || data_out === 5'b0) begin
      $display("ERROR %s: reset precondition not met (valid_out=%b data_out=%0h)", tag, valid_out, data_out);
      n_err++;
    end
    rst_n = 1'b0;
    #1;
    check_out({tag, "/after-reset"}, 1'b0, 1'b1, 5'h00);
    cancel_pending(tag, expect_cancel);
    @(posedge clk);
    #4;
    rst_n = 1'b1;
  endtask

  // Case 2: continuous valid_in, throughput check
  task automatic run_case2();
    logic [13:0] mem [0:511];
    real cpr;
    int  total;
    $readmemh("verif/vectors/exhaustive.hex", mem);
    drive_reset();
    chk_gap = 1'b1;

    for (int i = 0; i < 512; i++) begin
      logic [8:0] din;
      logic [4:0] exp;
      if ($isunknown(mem[i])) $fatal(1, "exhaustive.hex: entry %0d is X/missing", i);
      din = mem[i][13:5];
      exp = mem[i][4:0];
      send(din, exp);  // valid_in stays 1 between transactions
    end
    idle(1);
    repeat (4) @(posedge clk);  // last result arrives 2 edges after the last acceptance

    total = last_result - first_accept;
    cpr   = real'(total) / 512.0;
    if (total > 1024 + 2) begin
      $display("ERROR case2: %0d cycles from first acceptance to last result > 1026", total);
      n_err++;
    end
    if (lat_min != 2 || lat_max != 2) begin
      $display("ERROR case2: latency min/max = %0d/%0d, expected 2/2", lat_min, lat_max);
      n_err++;
    end
    $display("INFO case2 latency_cycles=%0d cycles_per_result=%0.3f total_cycles=%0d", lat_max, cpr, total);

    finish_test("case2");
  endtask

  // Case 3: handshake with 30% random bubbles; garbage data while not ready
  task automatic run_case3();
    logic [13:0] mem [0:511];
    int seed;
    int n_bub = 0;
    int n_stall = 0;
    bit accepted;
    if (!$value$plusargs("SEED=%d", seed)) seed = 1;
    void'($urandom(seed));
    $readmemh("verif/vectors/exhaustive.hex", mem);
    drive_reset();

    for (int i = 0; i < 512; i++) begin
      logic [8:0] din;
      logic [4:0] exp;
      if ($isunknown(mem[i])) $fatal(1, "exhaustive.hex: entry %0d is X/missing", i);
      din = mem[i][13:5];
      exp = mem[i][4:0];
      accepted = 1'b0;
      while (!accepted) begin
        @(negedge clk);
        cur_exp = exp;
        if (!ready_out) begin
          // not ready: keep valid_in=1 but present garbage; DUT must not take it
          valid_in = 1'b1;
          data_in  = ~din;
          n_stall++;
        end else if ($urandom_range(99) < 30) begin
          valid_in = 1'b0;   // bubble
          data_in  = ~din;
          n_bub++;
        end else begin
          valid_in = 1'b1;
          data_in  = din;
          @(posedge clk);    // acceptance edge
          n_sent++;
          accepted = 1'b1;
        end
      end
    end
    idle(1);

    if (n_bub == 0 || n_stall == 0) begin
      $display("ERROR case3: stimulus did not exercise bubbles (%0d) and stalls (%0d)", n_bub, n_stall);
      n_err++;
    end
    $display("INFO case3 seed=%0d bubbles=%0d stalls=%0d", seed, n_bub, n_stall);
    finish_test("case3");
  endtask

  // Case 4: asynchronous reset (a) in COMPUTE, (b) in DONE
  task automatic run_case4();
    logic [13:0] mem [0:511];
    int base;
    $readmemh("verif/vectors/exhaustive.hex", mem);
    drive_reset();

    // warm-up so that data_out is non-zero before the first reset
    if (mem[7][4:0] == 0 || mem[10][4:0] == 0 || mem[20][4:0] == 0) $fatal(1, "case4: chosen vectors need non-zero results");
    send(mem[7][13:5], mem[7][4:0]);
    idle(3);

    // (a) reset in the middle of COMPUTE: transaction is accepted, then cancelled
    send(mem[10][13:5], mem[10][4:0]);
    async_reset_pulse("case4a", 1'b0, 1);
    base = 100;
    for (int j = 0; j < 4; j++) begin
      send(mem[base+j][13:5], mem[base+j][4:0]);
      idle(2);
    end

    // (b) reset while valid_out = 1 (DONE)
    send(mem[20][13:5], mem[20][4:0]);
    idle(1);
    @(posedge clk);    // state is DONE after this edge
    async_reset_pulse("case4b", 1'b1, 1);
    base = 200;
    for (int j = 0; j < 4; j++) begin
      send(mem[base+j][13:5], mem[base+j][4:0]);
      idle(2);
    end

    finish_test("case4");
  endtask

  // Illegal state 2'b11: force it from IDLE, expect recovery to IDLE
  task automatic run_case_illegal();
    logic [13:0] mem [0:511];
    $readmemh("verif/vectors/exhaustive.hex", mem);
    drive_reset();
    @(negedge clk);
    force dut.u_ctrl.state = 2'b11;
    #1;
    if (dut.u_ctrl.state !== 2'b11 || valid_out !== 1'b0) begin
      $display("ERROR case_illegal: forced state=%b valid_out=%b", dut.u_ctrl.state, valid_out);
      n_err++;
    end
    @(posedge clk);      // forced for one full cycle
    #1;
    if (valid_out !== 1'b0) begin
      $display("ERROR case_illegal: valid_out=%b while state=11", valid_out);
      n_err++;
    end
    release dut.u_ctrl.state;
    @(posedge clk);      // at most one edge after release the FSM must be back in IDLE
    #1;
    if (dut.u_ctrl.state !== 2'b00 || valid_out !== 1'b0) begin
      $display("ERROR case_illegal: state=%b valid_out=%b one edge after release, expected state=00 valid_out=0",
               dut.u_ctrl.state, valid_out);
      n_err++;
    end
    // a transaction after recovery must produce the correct result
    send(mem[300][13:5], mem[300][4:0]);
    idle(2);

    // Variant (b): enter 2'b11 from DONE while valid_in=1 (next-state would be COMPUTE).
    // A missing 'default' branch would keep that stale next-state and fabricate a result.
    send(mem[301][13:5], mem[301][4:0]);   // accepted at edge k, valid_in stays 1
    @(negedge clk);                        // k+0.5: COMPUTE
    @(negedge clk);                        // k+1.5: DONE
    force dut.u_ctrl.state = 2'b11;
    #1;
    if (dut.u_ctrl.state !== 2'b11 || valid_out !== 1'b0 || ready_out !== 1'b0) begin
      $display("ERROR case_illegal/b: forced state=%b valid_out=%b ready_out=%b", dut.u_ctrl.state, valid_out, ready_out);
      n_err++;
    end
    cancel_pending("case_illegal/b", 1);   // in-flight transaction is abandoned by the illegal state
    // The COMPUTE edge already loaded this result into the output bank, so data_out legitimately
    // differs from the previous sample without a valid_out: restart the hold check from here.
    have_prev = 1'b0;
    @(posedge clk);
    #1;
    release dut.u_ctrl.state;
    idle(1);                               // drop valid_in at the next negedge
    @(posedge clk);
    #1;
    if (dut.u_ctrl.state !== 2'b00 || valid_out !== 1'b0) begin
      $display("ERROR case_illegal/b: state=%b valid_out=%b one edge after release, expected 00/0", dut.u_ctrl.state, valid_out);
      n_err++;
    end
    send(mem[302][13:5], mem[302][4:0]);
    idle(2);
    finish_test("case_illegal");
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
      "case2": run_case2();
      "case3": run_case3();
      "case4": run_case4();
      "case_illegal": run_case_illegal();
      "case5": run_case5();
      default: $fatal(1, "unknown test %s", test_name);
    endcase

    $finish;
  end

endmodule
