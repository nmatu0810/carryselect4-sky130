# CarrySelect-4 (CSLA 4-bit RTL→GDSII + Logical Effort) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo đủ ba sản phẩm cuối kỳ môn CE2032 – Thiết kế VLSI cho lõi cộng CarrySelect-4: (1) project chạy được (RTL, verification, synthesis/STA, GDSII qua OpenLane, layout full-custom cho Full Adder, phân tích Logical Effort), (2) bài báo IEEE tiếng Anh tối đa 4 trang, (3) báo cáo tiếng Việt dạng .docx và slide bảo vệ .pptx.

**Architecture:** Đi theo hai nhánh độc lập sau Task 0.
- **Nhánh số:** RTL → TB → Yosys/OpenSTA → OpenLane.
- **Nhánh full-custom:** τ/LE → FA schematic → layout → LVS/PEX/SPICE.

Mọi con số đo được đều ghi vào một file duy nhất `results/metrics.json`. Paper, báo cáo và slide đọc số từ file này, không chép tay, để ba sản phẩm không lệch số với nhau.

**Tech Stack:**
- **Ngôn ngữ / RTL:** SystemVerilog (dùng tập con Yosys hỗ trợ).
- **Mô phỏng:** Verilator ≥ 5.0 (`--binary --timing`); Python 3 + pytest cho golden model.
- **Toolchain số:** Yosys, OpenSTA, LibreLane (bản kế tục OpenLane 2, chạy `--dockerized`). Trong tài liệu gọi là "OpenLane 2 / LibreLane".
- **Full-custom:** Magic, Netgen, Ngspice với PDK sky130A, thư viện `sky130_fd_sc_hd`.
- **Tài liệu:** tectonic (LaTeX, IEEEtran), docx-js, pptxgenjs.

**Spec:** `/home/tus/workspace/VKU/VLSI/baocao_decuong_VLSI_TU_TRUNG.pdf`, kèm guideline 4 phase và bảng deliverables trong `/home/tus/workspace/VKU/VLSI/CSLA_VLSI_Project_Report.md` (mục II–VII). Nếu hai file mâu thuẫn, **PDF đề cương thắng**. Riêng định dạng deliverable (IEEE 4 trang, slide 15 phút) lấy theo file `.md`.

---

## Quy tắc cho agent thực thi (đọc trước mọi task)

1. **Phạm vi đọc:** chỉ đọc mục *Global Constraints*, *Design Decisions* và đúng task được giao. Không đọc các task khác. Mọi thứ bạn cần từ task trước nằm trong khối **Interfaces** của task mình.
2. **Không đọc nguyên file log lớn** (log OpenLane, log Yosys). Dùng `grep`, `tail -n 40` hoặc `jq`. Chỉ lưu bản tóm tắt vào `results/logs/<task>.txt`, tối đa 60 dòng.
3. **Ghi số liệu:** mọi số liệu task sinh ra phải ghi qua `python3 scripts/metrics.py set <key> <value>`, đúng tên key liệt kê trong task. Không tự đặt key mới nếu task không nói.
4. **Khi lệch spec:** nếu buộc phải làm khác spec hoặc khác Design Decisions (ví dụ tool lỗi, phải đổi tham số), ghi một mục vào `docs/DEVIATIONS.md` theo mẫu `## D<n>: <tiêu đề>` / `Spec:` / `Thực tế:` / `Lý do:` / `Ảnh hưởng:`. Không im lặng đổi.
5. **Kết thúc task:**
   - Chạy đủ các lệnh trong phần **Reviewer gate** và dán output (phần cuối) vào báo cáo task.
   - Commit theo đúng message ghi trong task.
6. **Shell là zsh:** trong lệnh shell, luôn đặt toán tử trong dấu nháy đơn, ví dụ `metrics.py check k '==' 0`, `'>='`, `'<'`. Nếu để trần, zsh sẽ hiểu `==` và `<` theo cú pháp riêng của nó và báo lỗi.
7. **Khi bị chặn:** nếu một gate không qua sau 3 lần sửa, dừng lại và báo cáo trạng thái BLOCKED, kèm lỗi cụ thể. Không nới gate.

## Global Constraints

- **Thư mục gốc:** project nằm tại `/home/tus/workspace/VKU/VLSI/CarrySelect4` (git repo riêng). Mọi lệnh chạy từ thư mục này.
- **Vị trí tool** (người dùng tự cài theo `docs/SETUP.md`; agent **không** cài tool, không dùng `sudo`):
  - **Native trên host:** `verilator`, `yosys`, `klayout`, `magic`, `netgen`, `ngspice`, `iverilog`, `gtkwave`, `tectonic`, `node`, `jq`.
  - **Trong Docker** (gọi qua `scripts/olsh`): `sta` (OpenSTA).
  - **Flow PnR:** `$FLOW_CLI --dockerized`, trong đó `FLOW_CLI` khai báo trong `scripts/env.sh` (mặc định `.venv/bin/librelane`).
  - **Python:** `.venv/bin/python` (Python 3.12, đã có `vcdvcd`, `matplotlib`, `pytest`).
  - Nếu thiếu tool: báo BLOCKED và ghi rõ tên tool.
- **PDK:**
  - `PDK_ROOT=$HOME/.ciel/ciel/sky130/versions/8afc8346a57fe1ab7934ba5a6056ea8b43078e71`. Nhánh số và nhánh full-custom dùng chung bản này.
  - Dùng `sky130A`, thư viện cell `sky130_fd_sc_hd`.
  - Liberty dùng cho synthesis/STA: `sky130_fd_sc_hd__tt_025C_1v80.lib`.
  - `PDK_ROOT` khai báo trong `scripts/env.sh`. Mọi script phải `source scripts/env.sh`.
- **Top-level:** module `carryselect4_top`, cổng đúng thứ tự sau:
  ```
  input  logic       clk, rst_n, valid_in,
  input  logic [8:0] data_in,      // {cin, b[3:0], a[3:0]}: a=data_in[3:0], b=data_in[7:4], cin=data_in[8]
  output logic       ready_out, valid_out,
  output logic [4:0] data_out      // {cout, sum[3:0]} = a + b + cin
  ```
- **Kiến trúc CSLA 2+2:**
  - 6 FA chia thành 3 RCA 2-bit: một khối `low` nhận `cin` thật; hai khối `hi0`/`hi1` với Cin cố định 0/1.
  - 3 MUX 2:1 một bit, chọn theo `c2`: hai MUX cho `sum[3:2]`, một MUX cho `cout`.
  - `sum[1:0]` lấy thẳng từ `low`.
- **Thanh ghi:**
  - Bank vào 9 FF có enable `ld_en`; bank ra 5 FF có enable `out_en`; FSM 2 FF. Tổng cộng **16 FF**.
  - Đồng bộ cạnh lên `clk`. Reset bất đồng bộ tích cực thấp. **Không có latch.**
- **FSM Moore, 2 bit, 3 trạng thái** (mã hóa và ngõ ra xem Design Decisions D-2).
- **Verification:**
  - **Kiến trúc TB:** testbench SystemVerilog tự kiểm tra, chạy trên Verilator; golden model Python độc lập; scoreboard so sánh mỗi lần `valid_out=1`.
  - **Kịch bản:** Case 1–5 đúng như đề cương.
  - **Ngưỡng đạt:** `512/512` khớp golden.
  - **Hành vi giao thức:** độ trễ 2 chu kỳ; thông lượng 1 kết quả / 2 chu kỳ; không có chu kỳ chết khi DONE→COMPUTE.
- **PPA:**
  - **Clock:** chu kỳ 10 ns (100 MHz). Yêu cầu WNS setup ≥ 0 và WNS hold ≥ 0 sau route. Mục tiêu mở rộng: 5 ns (200 MHz).
  - **Diện tích:** ≤ 500 NAND2 tương đương.
  - **Floorplan:** core utilization 55%, aspect ratio 1.0.
  - **Đối chiếu:** so Area–Delay với RCA-4.
- **Sign-off:** DRC (Magic và KLayout) = 0; LVS khớp; có file GDSII.
- **Full-custom:**
  - Leaf cell là Full Adder static CMOS 28T (mirror adder), vẽ trên Magic với **luật DRC sky130** (không dùng λ-SCMOS).
  - Có well/substrate tap chống latch-up; DRC = 0, Netgen LVS khớp.
  - Có PEX, mô phỏng Ngspice, đối chiếu với Logical Effort.
- **Sản phẩm tài liệu:**
  - **Paper:** IEEE (IEEEtran conference, 2 cột), **tiếng Anh, ≤ 4 trang**.
  - **Báo cáo:** **tiếng Việt, .docx**, font Times New Roman 13pt.
  - **Slide:** **.pptx tiếng Việt**, 14–18 slide, cho buổi trình bày 15 phút.
  - **Thông tin chung:** nhóm 7; sinh viên Ngụy Quốc Trung (23CE.B026, trungnq.23ceb@vku.udn.vn) và Nguyễn Minh Anh Tú (23CE085, tunma.23ce@vku.udn.vn); học phần CE2032; trường VKU, Khoa Kỹ thuật Máy tính và Điện tử.

## Design Decisions (chốt các điểm đề cương còn mơ hồ)

- **D-1 Reset:** `rst_n=0` xóa **cả 16 FF** về 0: FSM về IDLE, bank vào bằng 0, bank ra bằng 0. Đề cương chỉ ghi "xóa bank ra". Xóa cả bank vào giúp mô phỏng không có X và không tốn thêm diện tích đáng kể.
- **D-2 FSM:**
  - **Mã hóa:** `IDLE=2'b00`, `COMPUTE=2'b01`, `DONE=2'b10`. Trạng thái `2'b11` không hợp lệ → `next=IDLE`.
  - **Ngõ ra:**
    - `ready_out = (state==IDLE) | (state==DONE)`
    - `valid_out = (state==DONE)`
    - `out_en = (state==COMPUTE)`
    - `ld_en = valid_in & ready_out`
  - **Chuyển trạng thái:**
    - IDLE: `valid_in` → COMPUTE.
    - COMPUTE → DONE, không điều kiện.
    - DONE: `valid_in` → COMPUTE, ngược lại → IDLE.
- **D-3 Đầu ra không có backpressure:** sink luôn nhận kết quả, vì interface không có `ready_in`. Ghi điều này thành giả định trong báo cáo.
- **D-4 Định nghĩa đo trễ:** gọi `k` là cạnh lên mà tại đó lấy mẫu được `valid_in & ready_out = 1` (cạnh nhận). Khi đó `valid_out` được lấy mẫu bằng 1 tại cạnh `k+2`. Latency = 2. Hai cạnh nhận liên tiếp khi `valid_in` luôn bằng 1 cách nhau đúng 2 cạnh.
- **D-5 Đơn vị diện tích:**
  - `nand2_eq = tổng diện tích cell / diện tích sky130_fd_sc_hd__nand2_1`, trong đó diện tích nand2_1 đọc từ file liberty (kỳ vọng 3.7536 µm²).
  - Cell count báo cáo riêng. Ngưỡng 500 áp cho `nand2_eq`.
- **D-6 Giữ cấu trúc CSLA khi tổng hợp:**
  - Module `fa` và `mux2` mang thuộc tính `(* keep_hierarchy *)` để ABC không tái cấu trúc CSLA thành một bộ cộng khác.
  - Riêng Task 7 có thêm một biến thể flatten làm đối chứng.
- **D-7 SDC chung** (`syn/constraints.sdc`): `create_clock clk 10.0`; `set_input_delay 2.0` cho mọi input trừ `clk`; `set_output_delay 2.0`; `set_driving_cell sky130_fd_sc_hd__inv_2`; `set_load 0.0334` (pF); `set_clock_uncertainty 0.25`; `set_clock_transition 0.15`.
- **D-8 Phạm vi FA custom:** FA full-custom là bài nghiên cứu leaf cell theo Phase II/IV của guideline. Nó **không** được ghép vào luồng OpenLane: luồng OpenLane dùng standard cell. Báo cáo phải nói rõ điều này.
- **D-9 Đường tới hạn cho Logical Effort:**
  - Đường phân tích: `a0 → (FA0 carry gate → inv) → c1 → (FA1 carry gate → inv) → c2`, tức N = 4 tầng.
  - Tải tại `c2` bằng 3 lần điện dung chân `S` của `sky130_fd_sc_hd__mux2_1` (đọc từ liberty), tương ứng 3 MUX chọn theo `c2`.

## Review Focus

Năm tình huống đề cương không nêu thẳng nhưng dễ gây lỗi nhất. Mỗi dòng đã gắn thành test trong task sở hữu:

1. **`valid_in` có bong bóng ngẫu nhiên**, kể cả khi bỏ `valid_in` ở DONE để FSM về IDLE: không mất, không lặp giao dịch. → Task 5, Case 3 (`case3` chạy với 30% bong bóng).
2. **Reset khi đang ở DONE** (không chỉ ở COMPUTE) và **nhả reset sát cạnh clock**: `valid_out` không phát xung giả. → Task 5, Case 4 (hai biến thể).
3. **Trạng thái không hợp lệ `2'b11`**: tự về IDLE sau 1 cạnh và không phát `valid_out`. → Task 5, `case_illegal`.
4. **`data_out` phải giữ nguyên** giữa hai xung `valid_out`: chỉ đổi ở cạnh COMPUTE→DONE. → Task 5, kiểm tra kèm trong Case 2 và Case 3.
5. **Timing ở mọi corner sau route** (gồm `max_ss_100C_1v60` và các kiểm tra recovery/removal của `rst_n`), không chỉ corner tt. → Task 8, gate kiểm tra tất cả corner.

## Sơ đồ phụ thuộc

```
T0 ─┬─ T1 → T2 → T3 → T4 → T5 ───────────────┐
    │              └→ T6 → T7                 │
    │                   └→ T8 → T9 ───────────┤
    └─ T10 → T11 → T12 → T13 ─────────────────┤
                                              └→ T14 (figures) → T15 (paper) ┐
                                                                → T16 → T17 → T18 (docx) ┤
                                                                → T19 (slides) ┘→ T20 (final)
```

- **Nhánh song song:** T1–T9 (nhánh số) và T10–T13 (nhánh full-custom) có thể chạy song song.
- **Nhóm tài liệu:** T15, T16–T18 và T19 đều cần T14 đã xong. Riêng T16–T18 phải chạy tuần tự.

## Bảng key của `results/metrics.json`

Key ghi theo dạng chấm. Giá trị là số; trường hợp khác có ghi chú.

| Task | Keys |
|---|---|
| T0 | `env.verilator_version` (chuỗi), `env.yosys_version` (chuỗi), `env.openlane_version` (chuỗi), `env.magic_version` (chuỗi), `env.ngspice_version` (chuỗi), `env.pdk_hash` (chuỗi) |
| T2 | `sim.unit_csla4.checked`, `sim.unit_csla4.errors` |
| T4/T5 | `sim.case1.status` … `sim.case5.status` (`"PASS"`/`"FAIL"`), `sim.case_illegal.status`, `sim.exhaustive.checked`, `sim.exhaustive.errors`, `sim.latency_cycles`, `sim.cycles_per_result` |
| T6 | `synth.top.cell_count`, `synth.top.area_um2`, `synth.top.nand2_eq`, `synth.top.ff_count`, `synth.top.latch_count`, `synth.nand2_area_um2`, `sta.synth.wns_setup_ns`, `sta.synth.wns_hold_ns`, `sta.synth.crit_path` (chuỗi `"startpoint -> endpoint"`, đường **reg→reg**), `sta.synth.crit_arrival_ns` (reg→reg), `sta.synth.worst_path` (đường có slack xấu nhất toàn thiết kế, thường là I/O) |
| T7 | `cmp.{csla4,rca4,csla4_flat,rca4_flat}.{area_um2,nand2_eq,cell_count,delay_ns,adp}` (adp = area_um2 × delay_ns) |
| T8/T9 | `pnr.die_area_um2`, `pnr.core_util_pct`, `pnr.cell_count`, `pnr.wns_setup_ns`, `pnr.wns_hold_ns`, `pnr.wns_setup_worst_corner_ns`, `pnr.wns_hold_worst_corner_ns`, `pnr.fmax_mhz`, `pnr.drc_magic`, `pnr.drc_klayout`, `pnr.lvs_errors`, `pnr.antenna_violations`, `pnr.power_total_mw`, `pnr.wirelength_um`; nếu chạy được 5 ns thì thêm `pnr5.wns_setup_ns`, `pnr5.wns_hold_ns`, `pnr5.status` |
| T10 | `le.tau_ps`, `le.fo4_ps`, `le.pinv`, `le.wp_unit_um`, `le.wn_unit_um`, `le.c_mux_s_ff` |
| T11 | `fa.s1.delay_pre_ps`, `fa.s2.delay_pre_ps`, `fa.sizing_chosen` (`"S1"`/`"S2"`), `le.p_carry`, `le.G`, `le.B`, `le.H`, `le.F`, `le.N`, `le.fhat`, `le.D_est_tau`, `le.D_est_ps` |
| T12 | `fa.ntrans`, `fa.width_um`, `fa.height_um`, `fa.area_um2`, `fa.drc_errors`, `fa.taps` |
| T13 | `fa.lvs_match` (true/false), `fa.pex_cap_count`, `spice.D_pre_ps`, `spice.D_post_ps`, `le.err_pre_pct`, `le.err_post_pct` |

Tên thư mục và file cố định:
- `rtl/`, `verif/{golden,vectors,tb}/`, `syn/`, `pnr/`, `custom/fa/`, `analysis/le/`
- `results/{metrics.json,logs/}`, `docs/{DEVIATIONS.md,figures/}`
- `paper/`, `report/`, `slides/`

Thư mục `verif/out/`, `syn/out/`, `pnr/runs/`, `custom/fa/out/` được đưa vào `.gitignore`. Riêng artifact cuối được copy vào `pnr/final/` và commit.

---

### Task 0: Scaffold repo + toolchain

**Files:**
- Create: `Makefile`, `.gitignore`, `scripts/env.sh`, `scripts/olsh`, `scripts/metrics.py`, `scripts/test_metrics.py`, `docs/DEVIATIONS.md`, `results/metrics.json` (`{}`), `README.md`

**Interfaces:**
- Produces:
  - `source scripts/env.sh` export ra `PDK_ROOT`, `PDK=sky130A`, `LIB_TT` (đường dẫn tuyệt đối tới liberty tt), `OL_IMAGE` (image Docker LibreLane đã pull), `FLOW_CLI` (đường dẫn tới `.venv/bin/librelane`, hoặc `.venv/bin/openlane` nếu người dùng cài bản dự phòng).
  - `scripts/olsh "<cmd>"` chạy `<cmd>` bằng bash bên trong container `OL_IMAGE`. Container mount repo tại cùng đường dẫn và mount `PDK_ROOT`. Mã thoát của `olsh` bằng mã thoát của `<cmd>`.
  - `python3 scripts/metrics.py set <key> <value>`: giá trị được thử `json.loads`, lỗi thì lưu dạng chuỗi.
  - `python3 scripts/metrics.py get <key>`: in giá trị ra stdout; key không có thì thoát với mã 2.
  - `python3 scripts/metrics.py check <key> <op> <value>`: `op` thuộc `== != >= <= > <`; thoát 0 nếu đúng, 1 nếu sai, 2 nếu thiếu key.

- [x] **Step 1: Khởi tạo repo**
  - `git init`, tạo cây thư mục ở trên.
  - `.gitignore` gồm: `verif/out/`, `syn/out/`, `pnr/runs/`, `custom/fa/out/`, `.venv/`, `*.vcd`, `node_modules/`.
- [x] **Step 2: Viết test cho metrics.py** (`scripts/test_metrics.py`, chạy bằng pytest trên file JSON tạm, truyền qua biến môi trường `METRICS_FILE`):
  ```python
  def test_set_get_number(tmp_metrics): set("a.b", "1.5"); assert get("a.b") == 1.5
  def test_set_string(tmp_metrics): set("x", "abc -> d"); assert get("x") == "abc -> d"
  def test_check_ops(tmp_metrics): set("w", "0.3"); assert check("w", ">=", "0") == 0 and check("w", "<", "0") == 1
  def test_missing_key(tmp_metrics): assert check("nope", "==", "1") == 2
  ```
- [x] **Step 3:** Chạy `python3 -m pytest scripts/test_metrics.py -q`. Kỳ vọng FAIL vì chưa có module.
- [x] **Step 4:** Viết `scripts/metrics.py`. Chỉ dùng stdlib. Ghi file theo kiểu atomic (ghi file tạm rồi rename). Sắp xếp key khi dump.
  - Toàn bộ chu trình đọc–sửa–ghi của `set` phải nằm trong `fcntl.flock(LOCK_EX)` trên file `<metrics>.lock`, vì hai nhánh task có thể chạy song song.
  - Có test `test_concurrent_set`: dùng `subprocess` chạy song song 40 lệnh `set k<i> <i>`, sau đó file phải có đủ 40 key.
  - Trong `check`, so sánh số luôn dùng `float()`, để các giá trị như `1e-3` cũng so được.
- [x] **Step 5:** Chạy lại pytest. Kỳ vọng `5 passed`.
- [x] **Step 6: Viết `scripts/env.sh`** (tool đã được người dùng cài theo `docs/SETUP.md`; **không cài gì thêm**)
  - `export PDK_ROOT=$HOME/.ciel/ciel/sky130/versions/8afc8346a57fe1ab7934ba5a6056ea8b43078e71` và `export PDK=sky130A`. Đây là đúng bản PDK mà LibreLane 3.0.16 dùng (đã kiểm tra ngày 2026-10-20).
    - **Phải export** `PDK_ROOT`: magicrc của sky130A chỉ tìm được `sky130A.tech` khi biến này tồn tại.
    - **Không** dùng `/usr/local/share/pdk`: bản đó có hash khác (`1e3554…`).
    - `env.sh` phải kiểm tra `$PDK_ROOT/sky130A` tồn tại; nếu không thì thoát với mã 1.
  - `OL_IMAGE`: lấy từ `docker images --format '{{.Repository}}:{{.Tag}}' | grep -i librelane | head -1`. Nếu không có, thử `grep -i openlane`.
  - `FLOW_CLI`: dùng `.venv/bin/librelane` nếu tồn tại, nếu không thì `$FLOW_CLI` (từ `scripts/env.sh`).
  - `LIB_TT=$PDK_ROOT/sky130A/libs.ref/sky130_fd_sc_hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib`. Script phải kiểm tra file này tồn tại.
  - Ghi `env.pdk_hash` = `basename $PDK_ROOT`.
- [x] **Step 7: Viết `scripts/olsh`**: `docker run --rm --user "$(id -u):$(id -g)" -e HOME="$HOME" -e PDK_ROOT -e PDK -v "$HOME:$HOME" -w "$PWD" "$OL_IMAGE" bash -c "$*"`. Kiểm tra bằng `scripts/olsh "sta -version"`.
  - Phải có `--user`: nếu thiếu, file sinh ra trong repo sẽ thuộc quyền root.
  - Dùng `bash -c`, **không** dùng `-lc`: login shell sẽ source `~/.bashrc` của host và báo lỗi `sed: command not found`.
- [x] **Step 8: Kiểm tra tool trên host**
  - Chạy `verilator --version` (phải ≥ 5.0) và `yosys -V`.
  - Magic: `echo quit | magic -dnull -noconsole -rcfile $PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc` không có `error`.
  - Ngspice: netlist inverter với `.lib $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice tt` chạy `ngspice -b` không có `Error`.
  - Nếu có bước nào lỗi: báo BLOCKED, chỉ rõ bước nào trong `docs/SETUP.md` cần làm lại.
- [x] **Step 9: Tạo target `make tools`.** Target này in version các tool và ghi các key `env.*`.
- [x] **Step 10:** Commit `chore: scaffold CarrySelect4 repo, toolchain wrappers, metrics store`.

**Reviewer gate:**
```bash
python3 -m pytest scripts/test_metrics.py -q          # 5 passed (có test_concurrent_set)
scripts/olsh "touch syn_owner_test" && stat -c %u syn_owner_test && rm syn_owner_test   # in ra UID của user (1000), không phải 0
make tools && python3 scripts/metrics.py get env.verilator_version   # chuỗi bắt đầu bằng "Verilator 5."
scripts/olsh "true"; echo $?                          # 0
scripts/olsh "false"; echo $?                         # 1
```

---

### Task 1: Golden model Python + file vector

**Files:**
- Create: `verif/golden/golden.py`, `verif/golden/test_golden.py`
- Generated (commit): `verif/vectors/exhaustive.hex`, `verif/vectors/case1.hex`

**Interfaces:**
- Produces:
  - **Định dạng file hex:** mỗi dòng là 4 chữ số hex viết thường, mang một word 14 bit `{data_in[8:0], expected_data_out[4:0]}`, tức `word = (data_in << 5) | exp`, với `data_in = (cin<<8)|(b<<4)|a` và `exp = (cout<<4)|sum`.
  - **`exhaustive.hex`:** đúng 512 dòng; dòng thứ `i` (đánh số từ 0) ứng với `i = cin*256 + b*16 + a`.
  - **`case1.hex`:** các bộ trong `CASE1_TRIPLES`, giữ đúng thứ tự.
  - **Hàm:**
    - `add4(a:int, b:int, cin:int) -> tuple[int,int]` trả về `(sum, cout)`; ném `ValueError` nếu input ngoài miền giá trị.
    - `pack_word(a, b, cin) -> int`
    - `exhaustive_triples() -> list[tuple[int,int,int]]`
    - `write_hex(path, triples) -> None`
  - **Hằng số:** `CASE1_TRIPLES = [(0,0,0),(15,15,1),(15,1,0),(15,0,1),(1,1,0),(3,1,0)]`.
  - **CLI:** `python3 verif/golden/golden.py --outdir verif/vectors`.
  - **Make:** target `make golden`.

- [x] **Step 1: Viết test**
  ```python
  def test_add4_extremes():
      assert add4(0,0,0) == (0,0); assert add4(15,15,1) == (15,1)   # 31 = 0b1_1111
      assert add4(15,1,0) == (0,1); assert add4(15,0,1) == (0,1)
  def test_add4_range(): pytest.raises(ValueError, add4, 16, 0, 0); pytest.raises(ValueError, add4, 0, 0, 2)
  def test_pack_word():
      assert pack_word(0,0,0) == 0x0000; assert pack_word(15,15,1) == 0x3FFF; assert pack_word(15,1,0) == 0x03F0
  def test_exhaustive_order():
      t = exhaustive_triples(); assert len(t) == 512 and t[0] == (0,0,0) and t[17] == (1,1,0) and t[256] == (0,0,1)
  def test_case1_covers_both_c2():
      c2 = {((a&3)+(b&3)+c) >> 2 for a,b,c in CASE1_TRIPLES}; assert c2 == {0,1}
  def test_files(tmp_path):  # gọi main(["--outdir", tmp_path]); exhaustive.hex có 512 dòng, dòng 511 == "3fff"
  ```
- [x] **Step 2:** `python3 -m pytest verif/golden -q`. Kỳ vọng FAIL.
- [x] **Step 3:** Cài đặt `golden.py`. Chỉ dùng stdlib; cài phép cộng bằng `a+b+cin` rồi tách `% 16` và `// 16`.
- [x] **Step 4:** Chạy pytest, kỳ vọng `6 passed`. Sau đó chạy `make golden` để sinh hai file hex.
- [x] **Step 5:** Commit `feat(verif): python golden model and test vectors`.

**Reviewer gate:**
```bash
python3 -m pytest verif/golden -q            # 6 passed
wc -l verif/vectors/exhaustive.hex           # 512
sed -n '1p;512p' verif/vectors/exhaustive.hex   # 0000 / 3fff
```

---

### Task 2: RTL tổ hợp (fa, rca2, mux2, csla4, rca4) + unit TB vét cạn

**Files:**
- Create: `rtl/fa.sv`, `rtl/rca2.sv`, `rtl/mux2.sv`, `rtl/csla4.sv`, `rtl/rca4.sv`, `verif/tb/tb_csla4.sv`
- Modify: `Makefile` (thêm target `lint-comb`, `sim-unit`)

**Interfaces:**
- Produces (đúng tên module và tên cổng):
  - `(* keep_hierarchy *) module fa(input logic a, b, cin, output logic s, cout);`
  - `module rca2(input logic [1:0] a, b, input logic cin, output logic [1:0] s, output logic cout);` gồm 2 instance `fa`: `u_fa0`, `u_fa1`.
  - `(* keep_hierarchy *) module mux2(input logic d0, d1, sel, output logic y);` với `y = sel ? d1 : d0`.
  - `module csla4(input logic [3:0] a, b, input logic cin, output logic [3:0] sum, output logic cout);`
    - Instance: `u_low` (rca2, nhận cin, sinh `c2`), `u_hi0` (rca2, cin=1'b0), `u_hi1` (rca2, cin=1'b1), `u_mux_s2`, `u_mux_s3`, `u_mux_co`.
  - `module rca4(input logic [3:0] a, b, input logic cin, output logic [3:0] sum, output logic cout);` gồm 4 instance `fa`.
- **Quy ước RTL** (áp dụng cho mọi file trong `rtl/`): dùng `logic`, `always_comb`, `always_ff`, `localparam`. **Không** dùng `typedef enum`, `interface`, `package`; Yosys `read_verilog -sv` phải đọc được.

- [x] **Step 1: Viết `tb_csla4.sv`**
  - Instance cả `csla4` và `rca4`; vòng lặp 512 tổ hợp theo thứ tự `i = cin*256+b*16+a`.
  - Ở mỗi tổ hợp, so `{cout,sum}` của **cả hai** module với `a+b+cin`.
  - Đếm lỗi, cuối cùng in `RESULT unit_csla4 PASS checked=512 errors=0`. Nếu có lỗi, gọi `$fatal(1, ...)`.
- [x] **Step 2:** `make sim-unit`. Kỳ vọng FAIL vì chưa có module.
- [x] **Step 3:** Viết 5 file RTL theo đúng Interfaces.
- [x] **Step 4: Lint**
  - Lệnh: `make lint-comb`, tức `verilator --lint-only -Wall --top-module csla4 rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv`; chạy tương tự với rca4.
  - Kỳ vọng: không có warning nào.
- [x] **Step 5:** `make sim-unit`. Kỳ vọng có dòng `RESULT unit_csla4 PASS checked=512 errors=0`. Ghi `sim.unit_csla4.checked`/`errors`.
- [x] **Step 6:** Commit `feat(rtl): fa, rca2, mux2, csla4 (2+2) and rca4 reference`.

**Reviewer gate:**
```bash
make lint-comb 2>&1 | grep -c '%Warning'      # 0
make sim-unit | grep 'RESULT unit_csla4 PASS checked=512 errors=0'
grep -c 'fa ' rtl/rca2.sv; grep -E 'u_hi0|u_hi1|u_mux_co' rtl/csla4.sv   # có đủ instance
```

---

### Task 3: FSM điều khiển + top-level

**Files:**
- Create: `rtl/csla4_ctrl.sv`, `rtl/carryselect4_top.sv`
- Modify: `Makefile` (thêm target `lint`)

**Interfaces:**
- Consumes: `csla4` (Task 2).
- Produces:
  - `module csla4_ctrl(input logic clk, rst_n, valid_in, output logic ready_out, valid_out, ld_en, out_en);`
    - Thanh ghi trạng thái tên đúng là `state` (`logic [1:0]`), để TB có thể `force dut.u_ctrl.state`.
    - `localparam` gồm `S_IDLE=2'b00`, `S_COMPUTE=2'b01`, `S_DONE=2'b10`. Logic theo D-2.
  - `carryselect4_top`: cổng đúng như Global Constraints.
    - Instance: `u_ctrl` (csla4_ctrl), `u_csla` (csla4).
    - Thanh ghi: `a_q[3:0]`, `b_q[3:0]`, `cin_q` (nạp khi `ld_en`), `sum_q[3:0]`, `cout_q` (nạp khi `out_en`).
    - `data_out = {cout_q, sum_q}`.
    - Mọi FF: `always_ff @(posedge clk or negedge rst_n)`, reset về 0 (theo D-1).

- [x] **Step 1: Viết RTL theo Interfaces.**
- [x] **Step 2: Lint**
  - Lệnh: `make lint`, tức `verilator --lint-only -Wall --top-module carryselect4_top rtl/*.sv` (trừ `rca4.sv`).
  - Kỳ vọng: 0 warning.
- [x] **Step 3: Kiểm tra latch và số FF bằng Yosys generic**
  - Lệnh: `yosys -q -p "read_verilog -sv rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv rtl/csla4_ctrl.sv rtl/carryselect4_top.sv; synth -top carryselect4_top -flatten; select -assert-none t:\$_DLATCH*; stat"`.
  - Kỳ vọng: lệnh thoát với mã 0, và tổng số cell `$_DFF*`/`$_SDFF*`/`$_DFFE*` bằng 16.
- [x] **Step 4:** Commit `feat(rtl): moore FSM controller and registered top-level`.

**Reviewer gate:**
```bash
make lint 2>&1 | grep -c '%Warning'     # 0
grep -nE "S_IDLE *= *2'b00|S_COMPUTE *= *2'b01|S_DONE *= *2'b10" rtl/csla4_ctrl.sv   # 3 dòng
grep -n 'default' rtl/csla4_ctrl.sv      # nhánh default chuyển về S_IDLE
```

---

### Task 4: Top testbench khung + Case 1 và Case 5

**Files:**
- Create: `verif/tb/tb_top.sv`
- Modify: `Makefile` (thêm target `sim TEST=<name>`, `sim-all`, `wave TEST=<name>`)

**Interfaces:**
- Consumes:
  - `carryselect4_top` (Task 3).
  - Hai file hex và định dạng word (Task 1).
  - Tên `dut.u_ctrl.state`.
- Produces:
  - **Gọi chạy:** `make sim TEST=<name>` build bằng `verilator --binary --timing --trace` vào `verif/out/`, rồi chạy với `+TEST=<name>`.
  - **Output:** in `RESULT <name> PASS checked=<n> errors=0`, hoặc gọi `$fatal`. Dạng sóng ghi ra `verif/out/<name>.vcd`.
  - **`make sim-all`:** chạy lần lượt `case1 case2 case3 case4 case5 case_illegal`; dừng ở lỗi đầu tiên.
  - **Thành phần trong TB** (Task 5 dùng lại):
    - clock 10 ns;
    - `task automatic drive_reset()`;
    - `task automatic send(input logic [8:0] din, input logic [4:0] exp)`: giữ `valid_in=1` cho tới cạnh nhận rồi push `{exp, accept_cycle}` vào hàng đợi `sb_q`;
    - process monitor: ở mỗi `posedge clk`, nếu `valid_out` thì pop `sb_q` và so `data_out`, đồng thời kiểm tra `cycle - accept_cycle == 2` (theo D-4);
    - biến đếm `cycle`, `n_checked`, `n_err`;
    - `task automatic finish_test(string name)`: chờ `sb_q` rỗng (timeout 50 chu kỳ), kiểm tra `n_checked` bằng số giao dịch đã gửi, rồi in kết quả.

- [x] **Step 1: Viết khung TB** gồm clock, reset, driver, monitor, scoreboard, đọc vector bằng `$readmemh("verif/vectors/<file>.hex", mem)`, và nhánh chọn theo `+TEST`.
- [x] **Step 2: Case 1 (`case1`)**
  - Gửi các vector trong `case1.hex`, giữa hai giao dịch có 2 chu kỳ `valid_in=0`.
  - Kiểm tra thêm: vector `(15,15,1)` phải ra `data_out == 5'h1F`; vector `(15,1,0)` phải ra `cout == 1`.
- [x] **Step 3: Case 5 (`case5`)**
  - Gửi đủ 512 vector của `exhaustive.hex`, giữa hai giao dịch có 1 chu kỳ nghỉ.
  - Kỳ vọng `checked=512 errors=0`.
- [x] **Step 4:** `make sim TEST=case1 && make sim TEST=case5`. Kỳ vọng 2 dòng PASS.
- [x] **Step 5: Kiểm tra TB biết bắt lỗi**
  - Tạm sửa `rtl/mux2.sv` thành `y = sel ? d0 : d1`, chạy `make sim TEST=case5`. Kỳ vọng FAIL với `errors > 0`.
  - Hoàn tác thay đổi (`git checkout rtl/mux2.sv`). Ghi kết quả bước này vào `results/logs/t4.txt`.
- [x] **Step 6:** Ghi các key `sim.case1.status`, `sim.case5.status`, `sim.exhaustive.checked=512`, `sim.exhaustive.errors=0`.
- [x] **Step 7:** Commit `test(verif): self-checking top TB with scoreboard; case1, case5`.

**Reviewer gate:**
```bash
make sim TEST=case1 | grep 'RESULT case1 PASS'
make sim TEST=case5 | grep 'RESULT case5 PASS checked=512 errors=0'
cat results/logs/t4.txt          # có bằng chứng mutation bị bắt (errors>0)
git diff --stat HEAD -- rtl/     # rỗng
```

---

### Task 5: Case 2, 3, 4 + trạng thái không hợp lệ

**Files:**
- Modify: `verif/tb/tb_top.sv`

**Interfaces:**
- Consumes: các task và process của TB (Task 4).
- Produces: thêm các `+TEST` là `case2`, `case3`, `case4`, `case_illegal`. Ghi các key `sim.case2..4.status`, `sim.case_illegal.status`, `sim.latency_cycles`, `sim.cycles_per_result`.

- [x] **Step 1: Case 2 (`case2`), thông lượng**
  - Gửi 512 vector liên tục; `valid_in=1` ngay khi `ready_out=1`.
  - Kiểm tra:
    - mọi kết quả đều có latency = 2;
    - hai cạnh nhận liên tiếp cách nhau đúng 2 cạnh (không có chu kỳ chết);
    - tổng số chu kỳ từ cạnh nhận đầu tiên tới kết quả cuối ≤ 1024 + 2.
  - Kiểm tra kèm (Review Focus 4): `data_out` chỉ được đổi ở cạnh ngay trước một cạnh có `valid_out=1`. Cụ thể, lưu `data_out` của cạnh trước; nếu giá trị đổi mà `valid_out` hiện tại bằng 0 thì tính là lỗi.
  - In `cycles_per_result=<x>`. Ghi `sim.latency_cycles=2`, `sim.cycles_per_result=<x>` (kỳ vọng 2.0).
- [x] **Step 2: Case 3 (`case3`), handshake**
  - Nguồn luôn có dữ liệu. Khi `ready_out=0`, driver vẫn giữ `valid_in=1` nhưng đổi `data_in` sang `~din` (giá trị rác).
  - Thêm 30% bong bóng ngẫu nhiên `valid_in=0` (seed cố định bằng `+SEED=1`).
  - Kiểm tra: số giao dịch nhận được bằng số kết quả bằng 512; hàng đợi rỗng khi kết thúc.
  - Kiểm tra `data_out` giữ nguyên như trong Case 2.
- [x] **Step 3: Case 4 (`case4`), reset bất đồng bộ.** Gồm hai biến thể chạy nối tiếp trong cùng test:
  - **(a) Reset giữa COMPUTE:**
    - Nhận một giao dịch, rồi kéo `rst_n=0` tại `posedge + 3ns`.
    - Sau 1 ns, kiểm tra `valid_out==0`, `ready_out==1`, `data_out==0`.
    - Nhả `rst_n` tại `posedge + 4ns` của chu kỳ sau. Xóa hàng đợi scoreboard (giao dịch bị hủy).
    - Gửi 4 giao dịch mới, tất cả phải đúng. Không được có `valid_out` nào cho giao dịch đã hủy.
  - **(b) Reset trong DONE:** làm tương tự, nhưng kéo reset lúc `valid_out=1`.
- [x] **Step 4: Trạng thái không hợp lệ (`case_illegal`)**
  - Ở IDLE, `force dut.u_ctrl.state = 2'b11;` giữ 1 chu kỳ, rồi `release`.
  - Kiểm tra: trong lúc state = 11 thì `valid_out==0`; sau ≤ 1 cạnh state về `2'b00`; một giao dịch gửi sau đó cho kết quả đúng.
  - Nếu Verilator không hỗ trợ `force` trên tín hiệu này, ghi D<n> vào DEVIATIONS.md và thay bằng kiểm tra formal: `yosys -p "... ; sat -prove-asserts"` với assert `state != 2'b11 |=> state==S_IDLE`. Đây là phương án dự phòng, chỉ dùng khi bắt buộc.
- [x] **Step 5:** `make sim-all`. Kỳ vọng 6 dòng `RESULT ... PASS`.
- [x] **Step 6:** Commit `test(verif): throughput, handshake, async reset and illegal-state cases`.

**Reviewer gate:**
```bash
make sim-all | grep -c 'RESULT .* PASS'      # 6
python3 scripts/metrics.py check sim.latency_cycles '==' 2 && python3 scripts/metrics.py check sim.cycles_per_result '==' 2
ls verif/out/case2.vcd verif/out/case4.vcd
```

---

### Task 6: Synthesis Yosys + SDC + OpenSTA (top)

**Files:**
- Create: `syn/synth.ys`, `syn/constraints.sdc`, `syn/sta.tcl`, `scripts/parse_synth.py`
- Modify: `Makefile` (thêm target `synth`, `sta`)

**Interfaces:**
- Consumes: các file RTL (Task 2, Task 3); biến `LIB_TT`, `olsh`.
- Produces:
  - `syn/out/carryselect4_top.syn.v` (giữ phân cấp `fa`, `mux2` theo D-6).
  - `syn/constraints.sdc` theo đúng D-7. **Task 8 dùng lại file này.**
  - Các key `synth.*` và `sta.synth.*`.
  - `results/logs/t6_sta.txt`: đường tới hạn dạng full, tối đa 60 dòng.

- [x] **Step 1: Viết `synth.ys`**
  - Đọc RTL (không đọc `rca4.sv`) → `hierarchy -check -top carryselect4_top` → `synth -top carryselect4_top` → `dfflibmap -liberty $LIB_TT` → `abc -liberty $LIB_TT` → `opt_clean` → `stat -liberty $LIB_TT` → `write_verilog -noattr`.
  - Truyền đường dẫn liberty bằng `-p`, hoặc sinh file `.ys` từ Makefile.
- [x] **Step 2: Viết `constraints.sdc`** theo D-7. Danh sách input lấy bằng `[delete_from_list [all_inputs] [get_ports clk]]`.
- [x] **Step 3: Viết `sta.tcl`**
  - Trình tự: `read_liberty`, `read_verilog`, `link_design carryselect4_top`, `read_sdc`.
  - Report: `report_checks -path_delay max -fields {slew cap input_pins} -digits 3`, `report_checks -path_delay min`, `report_wns`, `report_worst_slack -max/-min`.
  - **Thêm report reg→reg riêng:** `report_checks -path_delay max -from [all_registers -clock_pins] -to [all_registers -data_pins] -fields {slew cap input_pins} -digits 3`. Lý do: với input/output delay 2 ns, đường có slack xấu nhất toàn thiết kế gần như chắc chắn là đường I/O (`data_in`/`valid_in` → FF, hoặc FF → `data_out`), không phải bộ cộng. Đường của bộ cộng (`a_q/b_q/cin_q` → `sum_q/cout_q`) chỉ hiện ra ở report reg→reg.
  - Ghi vào `results/logs/t6_sta.txt` cả hai: đường reg→reg đầy đủ (≤ 60 dòng) và tóm tắt startpoint/endpoint/slack của đường xấu nhất toàn thiết kế.
- [x] **Step 4: Viết `parse_synth.py`**
  - Đọc log `stat` và log STA, rồi ghi các key: `synth.top.cell_count`, `synth.top.area_um2`, `synth.top.ff_count` (đếm cell tên chứa `df`), `synth.top.latch_count` (đếm cell tên chứa `dlx` hoặc `dlatch`), `synth.nand2_area_um2` (grep `cell ("sky130_fd_sc_hd__nand2_1")` rồi lấy `area` từ liberty), `synth.top.nand2_eq`, `sta.synth.wns_setup_ns`, `sta.synth.wns_hold_ns`, `sta.synth.crit_path`, `sta.synth.crit_arrival_ns`, `sta.synth.worst_path`.
  - `crit_path` và `crit_arrival_ns` lấy từ report **reg→reg**. `wns_*` và `worst_path` lấy từ report toàn thiết kế.
  - **Yosys 0.66 in `stat` theo định dạng mới.** Khi giữ phân cấp, có bảng riêng cho từng module và một khối tổng cho top ("design hierarchy" / "Count including submodules"). Diện tích và số cell của top phải là **tổng kể cả submodule** (fa ×6, mux2 ×3, …), không lấy riêng dòng của module top. Parser phải tự kiểm tra: tổng diện tích = Σ (số instance × diện tích từng module), lệch thì `sys.exit(1)`.
  - **Quy ước WNS:** OpenSTA in WNS = 0 khi không có slack âm. Hãy ghi **worst slack** (giá trị dương) vào các key `wns_*`, và ghi chú điều này trong DEVIATIONS.md (D-n "WNS hiểu là worst slack").
- [x] **Step 5:** `make synth sta`.
- [x] **Step 6:** Commit `feat(syn): yosys sky130 synthesis, SDC, OpenSTA signoff at 10ns`.

**Reviewer gate:**
```bash
make synth sta
python3 scripts/metrics.py check synth.top.latch_count '==' 0
python3 scripts/metrics.py check synth.top.ff_count '==' 16
python3 scripts/metrics.py check synth.top.nand2_eq '<=' 500
python3 scripts/metrics.py check sta.synth.wns_setup_ns '>=' 0 && python3 scripts/metrics.py check sta.synth.wns_hold_ns '>=' 0
python3 scripts/metrics.py get sta.synth.crit_path     # kỳ vọng bắt đầu ở a_q/b_q/cin_q, kết thúc ở cout_q hoặc sum_q[3:2]
```

---

### Task 7: So sánh Area–Delay giữa CSLA-4 và RCA-4

**Files:**
- Create: `syn/synth_cmp.ys` (tham số `TOP` và `FLAT`), `syn/cmp.sdc`, `syn/sta_cmp.tcl`, `scripts/run_cmp.sh`
- Modify: `Makefile` (thêm target `compare`)

**Interfaces:**
- Consumes: `csla4`, `rca4` (Task 2); `LIB_TT`; quy ước WNS ở Task 6.
- Produces: các key `cmp.{csla4,rca4,csla4_flat,rca4_flat}.{area_um2,nand2_eq,cell_count,delay_ns,adp}`; file `results/cmp.csv` có header `variant,area_um2,nand2_eq,cell_count,delay_ns,adp`.

- [x] **Step 1: Viết `cmp.sdc`**
  - Dùng virtual clock: `create_clock -name vclk -period 10`.
  - `set_input_delay 0` và `set_output_delay 0` theo `vclk`; driving cell và load giống D-7.
  - Định nghĩa: **delay = data arrival time** của đường max, đo từ input tới output.
- [x] **Step 2: Viết `run_cmp.sh`**
  - Chạy 4 biến thể:
    - `csla4` và `rca4`: giữ `keep_hierarchy`.
    - `csla4_flat` và `rca4_flat`: bỏ thuộc tính bằng `setattr -mod -unset keep_hierarchy fa mux2`, sau đó chạy `synth -flatten`.
  - Mỗi biến thể chạy synth rồi STA, sau đó parse và ghi key, đồng thời ghi một dòng CSV.
- [x] **Step 3:** `make compare`.
- [x] **Step 4: Ghi nhận xét sơ bộ** vào `results/logs/t7.txt`, tối đa 10 dòng:
  - so delay và area giữa CSLA và RCA (bản giữ phân cấp);
  - so bản flatten với bản giữ phân cấp, tức ABC tái cấu trúc thế nào.

  **Không** sửa RTL để số liệu "đẹp hơn". Nếu CSLA không nhanh hơn RCA, cứ ghi đúng như vậy; báo cáo sẽ phân tích nguyên nhân.
- [x] **Step 5:** Commit `feat(syn): CSLA vs RCA area-delay comparison`.

**Reviewer gate:**
```bash
make compare && wc -l results/cmp.csv        # 5 dòng (header + 4)
for v in csla4 rca4 csla4_flat rca4_flat; do python3 scripts/metrics.py get cmp.$v.delay_ns; done   # 4 số > 0
```

---

### Task 8: OpenLane 2 / LibreLane, chạy tới GDSII

**Files:**
- Create: `pnr/config.json`, `scripts/run_pnr.sh`
- Modify: `Makefile` (thêm target `pnr`, `pnr5`)

**Interfaces:**
- Consumes: các file RTL (bỏ `rca4.sv`); `syn/constraints.sdc` (Task 6); `$FLOW_CLI` (từ `scripts/env.sh`).
- Produces:
  - Thư mục run `pnr/runs/run_10ns/`.
  - Thư mục `pnr/final/`, gồm các file copy từ `runs/run_10ns/final/`: `gds/carryselect4_top.gds`, `def/`, `nl/`, `spef/nom/`, `metrics.json`, các report DRC/LVS. Sau đó đổi tên thành `pnr/final/carryselect4_top.gds` và `pnr/final/ol_metrics.json`.

- [ ] **Step 1: Viết `config.json`**
  - Giá trị chốt: `DESIGN_NAME=carryselect4_top`, `VERILOG_FILES` (liệt kê từng file trong `rtl/` trừ `rca4.sv`), `CLOCK_PORT=clk`, `CLOCK_PERIOD=10`, `FP_CORE_UTIL=55`, `FP_ASPECT_RATIO=1`, `PNR_SDC_FILE` và `SIGNOFF_SDC_FILE` trỏ tới `syn/constraints.sdc`.
  - Giữ phân cấp CSLA khi tổng hợp (D-6). Tên biến cụ thể cần tra trong docs của đúng phiên bản OpenLane đã cài (`$FLOW_CLI --version`); kỳ vọng là `SYNTH_HIERARCHY_MODE`. Ghi tên biến đã dùng vào `results/logs/t8.txt`.
- [ ] **Step 2:** Chạy `scripts/run_pnr.sh 10 run_10ns`, tức `$FLOW_CLI --dockerized --run-tag run_10ns --overwrite pnr/config.json`, chạy nền và chuyển log ra file.
- [ ] **Step 3: Nếu run lỗi**
  - Chỉ đọc 40 dòng cuối log và file `error.log` của step lỗi.
  - Lỗi thường gặp với die quá nhỏ: PDN, IO placement. Cách xử lý được phép, theo thứ tự:
    1. Giảm `FP_PDN_VPITCH`/`FP_PDN_HPITCH`, chỉnh `FP_PDN_*OFFSET`.
    2. Tăng `PL_TARGET_DENSITY_PCT`.
    3. Chuyển sang `FP_SIZING=absolute` với `DIE_AREA` đủ lớn.
  - **Mỗi lần đổi** đều phải ghi D<n> vào DEVIATIONS.md. Không được tắt các step sign-off.
- [ ] **Step 4:** Copy artifact cuối vào `pnr/final/` theo mục Interfaces.
- [ ] **Step 5 (mở rộng, không bắt buộc qua gate):** chạy `make pnr5`, tức cùng config nhưng `CLOCK_PERIOD=5` (file `syn/constraints.sdc` được sinh lại với 5.0 vào `syn/out/constraints_5ns.sdc`), run tag `run_5ns`. Ghi `pnr5.status` (`"PASS"`/`"FAIL"`) và hai giá trị WNS.
- [ ] **Step 6:** Commit `feat(pnr): OpenLane2 RTL-to-GDSII at 10ns` (chỉ add `pnr/config.json`, `scripts/`, `pnr/final/`).

**Reviewer gate:**
```bash
ls -la pnr/final/carryselect4_top.gds
jq 'with_entries(select(.key|test("timing__(setup|hold)__ws")))' pnr/final/ol_metrics.json   # mọi corner >= 0  (Review Focus 5)
jq '."magic__drc_error__count", ."klayout__drc_error__count", ."design__lvs_error__count"' pnr/final/ol_metrics.json   # 0 0 0
```
(Nếu tên key khác do version, Task 9 sẽ ánh xạ. Gate chỉ cần bằng chứng các số đều bằng 0 và các slack đều ≥ 0.)

---

### Task 9: Trích số liệu sau PnR + ảnh layout

**Files:**
- Create: `scripts/parse_ol_metrics.py`, `scripts/gds2png.py` (script KLayout)
- Generated: `docs/figures/layout_top.png`, `docs/figures/layout_top_zoom.png`

**Interfaces:**
- Consumes: `pnr/final/ol_metrics.json`, `pnr/final/carryselect4_top.gds` (Task 8).
- Produces:
  - Các key `pnr.*` (theo Bảng key).
  - `pnr.fmax_mhz = 1000 / (10 - pnr.wns_setup_ns)`, tính ở corner nom tt. Lưu ý `pnr.wns_setup_ns` ở đây là worst slack, nên công thức cho ra tần số tối đa ước lượng.
  - `scripts/gds2png.py` dùng được với tham số: `klayout -zz -r scripts/gds2png.py -rd gds=<path> -rd out=<png> -rd w=1600`. **Task 14 dùng lại script này.**

- [ ] **Step 1: Viết `parse_ol_metrics.py`**
  - In danh sách key của `ol_metrics.json` có chứa `timing`, `drc`, `lvs`, `antenna`, `power`, `wirelength`, `area`, `utilization`, `count`.
  - Ánh xạ sang các key `pnr.*`. `pnr.*_worst_corner_ns` là giá trị nhỏ nhất qua mọi corner.
  - Bảng ánh xạ ghi trong comment đầu file.
- [ ] **Step 2: Viết `gds2png.py`** dùng `pya.LayoutView` ở chế độ headless: `load_layout`, `max_hier`, `zoom_fit`, `save_image`. Sinh 2 ảnh:
  - ảnh toàn chip;
  - ảnh zoom vào vùng bằng 30% die tính từ tâm.
- [ ] **Step 3:** Chạy cả hai script.
- [ ] **Step 4:** Commit `feat(pnr): extract post-route metrics and layout renders`.

**Reviewer gate:**
```bash
for k in wns_setup_ns wns_hold_ns wns_setup_worst_corner_ns wns_hold_worst_corner_ns; do python3 scripts/metrics.py check pnr.$k '>=' 0; done
for k in drc_magic drc_klayout lvs_errors; do python3 scripts/metrics.py check pnr.$k '==' 0; done
python3 scripts/metrics.py get pnr.core_util_pct ; file docs/figures/layout_top.png   # PNG 1600 px
```
Ảnh `layout_top.png`: reviewer mở ra xem bằng mắt, phải thấy rõ cell và đường route.

---

### Task 10: Đặc trưng hóa τ (FO4) + công cụ tính Logical Effort

**Files:**
- Create: `analysis/le/le_calc.py`, `analysis/le/test_le_calc.py`, `analysis/le/inv_fo4.sp`, `analysis/le/run_tau.py`
- Modify: `Makefile` (thêm target `tau`, `le-test`)

**Interfaces:**
- Produces:
  - **Các hàm trong `le_calc.py`**, chỉ dùng stdlib:
    - `path_effort(g: list[float], b: list[float], H: float) -> float`: tích các g, nhân tích các b, nhân H.
    - `stage_effort(F: float, N: int) -> float`: F^(1/N).
    - `path_delay_tau(g, h, p) -> float`: Σ(gᵢ·hᵢ + pᵢ).
    - `min_delay_tau(F, N, P) -> float`: N·F^(1/N) + P.
    - `optimal_sizes(g, b, c_in: float, c_load: float) -> list[float]`: trả về điện dung vào của từng tầng. Tính ngược từ tải: `C_in,i = gᵢ·bᵢ·C_in,i+1 / f̂`, với `C_in,N+1 = c_load`.
  - **Các key:** `le.tau_ps`, `le.fo4_ps`, `le.pinv`, `le.wn_unit_um`, `le.wp_unit_um`, `le.c_mux_s_ff`.
  - **Kích thước inverter đơn vị:** `Wn=0.42 µm`, `L=0.15 µm`. `Wp` chọn trong {0.84, 1.00, 1.26} µm sao cho |tpdr − tpdf| nhỏ nhất ở FO4.

- [ ] **Step 1: Viết test**
  ```python
  def test_fo4(): assert path_delay_tau([1],[4],[1]) == 5
  def test_chain(): assert stage_effort(64,3) == pytest.approx(4); assert min_delay_tau(64,3,3) == pytest.approx(15)
  def test_sizes(): assert optimal_sizes([1,1,1],[1,1,1],1,64) == pytest.approx([1,4,16])
  def test_branch(): assert path_effort([2,1],[3,1],2) == 12
  ```
- [ ] **Step 2:** `make le-test`. Kỳ vọng FAIL.
- [ ] **Step 3:** Cài đặt các hàm. Chạy lại, kỳ vọng `4 passed`.
- [ ] **Step 4: Viết `inv_fo4.sp`**
  - Mạch: chuỗi inverter, tầng cần đo tải đúng 4 inverter giống hệt nó; tầng trước làm nhiệm vụ tạo slope thực.
  - Model: `.lib .../sky130.lib.spice tt`, VDD = 1.8 V, 27 °C, `.tran 1p 4n`.
  - Đo bằng `.meas` 50%–50%: `tpdr`, `tpdf`. Đặt `tpd = (tpdr + tpdf) / 2`.
  - Đo thêm `tpd` khi tầng đó không tải (fanout 0) để suy ra `pinv`.
- [ ] **Step 5: Viết `run_tau.py`**
  - Quét 3 giá trị `Wp`, chọn giá trị cân bằng nhất.
  - Tính: `fo4_ps = tpd`, `tau_ps = fo4_ps / 5`, `pinv = tpd_unloaded / tau_ps`.
  - Đọc chân `S` của `sky130_fd_sc_hd__mux2_1` trong liberty tt, ghi `le.c_mux_s_ff` (đổi pF sang fF).
  - Ghi tất cả key.
- [ ] **Step 6:** Commit `feat(le): logical-effort calculator and FO4 tau characterization`.

**Reviewer gate:**
```bash
make le-test   # 4 passed
make tau && python3 scripts/metrics.py check le.tau_ps '>' 5 && python3 scripts/metrics.py check le.tau_ps '<' 40   # sky130 tt: τ thường cỡ 10–20 ps
python3 scripts/metrics.py get le.wp_unit_um
```

---

### Task 11: FA 28T (mirror adder): schematic, mô phỏng trước layout, chọn sizing theo LE

**Files:**
- Create: `custom/fa/fa_cell_s1.spice`, `custom/fa/fa_cell_s2.spice`, `custom/fa/sim/fa_func.sp`, `custom/fa/sim/path_pre.sp`, `analysis/le/fa_path.py`
- Generated: `custom/fa/fa_cell.spice` (bản copy của sizing được chọn)

**Interfaces:**
- Consumes: các key `le.*` và hàm của `le_calc.py` (Task 10).
- Produces:
  - **Subckt:** `.subckt fa_cell A B CI S CO VPWR VGND`. Body nMOS nối `VGND`, body pMOS nối `VPWR`.
  - **Linh kiện:** `sky130_fd_pr__nfet_01v8` / `sky130_fd_pr__pfet_01v8`, `L=0.15`.
  - **Cấu trúc 28T:** carry gate đảo `COb` (mirror), inverter tạo `CO`; sum gate đảo `Sb` (mirror, dùng `COb`), inverter tạo `S`.
  - **Sizing S1 (theo độ sâu stack):** mỗi transistor có `W = k × W_unit`, với `k` là số transistor nối tiếp trên nhánh của nó: `k=2` cho carry gate và các nhánh 2-stack của sum gate, `k=3` cho nhánh 3-stack. Inverter đầu ra dùng kích thước đơn vị.
  - **Sizing S2:** giống S1, chỉ thay kích thước inverter `CO` bằng giá trị từ `optimal_sizes` cho đường D-9.
  - **File chọn:** `custom/fa/fa_cell.spice` là bản copy của sizing được chọn. Task 12 vẽ layout theo đúng file này, và Task 13 chạy LVS với nó.
  - **Tham số đường D-9:** `fa_path.py` tính `le.G`, `le.B`, `le.H`, `le.F`, `le.N=4`, `le.fhat`, `le.D_est_tau`, `le.D_est_ps`.
    - `g_carry = 2`, `g_inv = 1`.
    - `p_carry` đo từ mô phỏng carry gate không tải, chia cho τ.
    - `B` tính từ điện dung thật: tại `CO` của FA0, tải gồm chân `CI` của carry gate FA1 cộng chân `CI` của sum gate FA1; `B = tổng / phần nằm trên đường`. Điện dung chân lấy từ tổng `W·Cg`, với `Cg` đo trong mô phỏng hoặc lấy từ hằng số model ghi trong comment.
    - `H = C_load / C_in(A)`, với `C_load = 3·le.c_mux_s_ff`.

- [ ] **Step 1: Viết `fa_func.sp`**
  - Quét 8 tổ hợp `A, B, CI` bằng nguồn PWL. Dùng `.meas` hoặc in giá trị tại giữa mỗi khoảng.
  - Thêm script so `S`/`CO` với bảng chân trị; logic 1 nghĩa là > 0.9·VDD, logic 0 nghĩa là < 0.1·VDD.
  - Chạy với `fa_cell_s1.spice`. Kỳ vọng FAIL vì file chưa có.
- [ ] **Step 2:** Viết `fa_cell_s1.spice`. Chạy lại, kỳ vọng 8/8 đúng.
- [ ] **Step 3: Viết `path_pre.sp`**
  - Mạch: 2 instance `fa_cell` nối thành RCA2 (`CO` của FA0 vào `CI` của FA1). Tải tại `CO` của FA1 là tụ `3·c_mux_s_ff`.
  - Kích: `A0` đổi 0→1 và 1→0, với `B0=1`, `CI0=0`, `A1⊕B1=1` để carry lan qua hết.
  - Đo `tpd(A0 → CO1)`, lấy trung bình hai cạnh.
- [ ] **Step 4:** Chạy `fa_path.py`, ghi các key `le.*`. Sinh `fa_cell_s2.spice` từ `optimal_sizes` (chỉ đổi inverter `CO`).
- [ ] **Step 5:** Chạy `path_pre.sp` cho S1 và S2, ghi `fa.s1.delay_pre_ps` và `fa.s2.delay_pre_ps`.
  - Chọn bản nhanh hơn. Nếu delay chênh nhau < 3%, chọn bản nhỏ hơn về diện tích.
  - Ghi `fa.sizing_chosen`, copy bản đã chọn thành `fa_cell.spice`.
- [ ] **Step 6:** Commit `feat(custom): 28T mirror full adder schematic, LE-driven sizing`.

**Reviewer gate:**
```bash
ngspice -b custom/fa/sim/fa_func.sp | tail -3     # 8/8 PASS
for k in G B H F fhat D_est_ps p_carry; do python3 scripts/metrics.py get le.$k; done
python3 scripts/metrics.py get fa.sizing_chosen; grep -c 'sky130_fd_pr__' custom/fa/fa_cell.spice   # 28
```

---

### Task 12: Layout FA trên Magic + DRC + tap chống latch-up + Euler path

**Files:**
- Create: `custom/fa/fa_cell.mag`, `custom/fa/euler.md`, `custom/fa/drc.tcl`, `scripts/fa_stats.py`
- Generated: `custom/fa/out/fa_cell.gds`, `docs/figures/fa_layout.png`

**Interfaces:**
- Consumes: `custom/fa/fa_cell.spice` (Task 11), gồm tên cổng và W của từng transistor; `scripts/gds2png.py` (Task 9).
- Produces:
  - Cell Magic `fa_cell`. Label cổng đúng tên `A B CI S CO VPWR VGND`; `VPWR`/`VGND` là rail metal1 ngang ở mép trên và mép dưới.
  - File GDS. Các key `fa.ntrans`, `fa.width_um`, `fa.height_um`, `fa.area_um2`, `fa.drc_errors`, `fa.taps`.

- [ ] **Step 1: Viết `euler.md`**
  - Vẽ đồ thị PUN và PDN của carry gate và sum gate (liệt kê cạnh dưới dạng văn bản).
  - Chỉ ra một chuỗi Euler chung (thứ tự cổng poly) cho từng gate.
  - Ghi chỗ nào diffusion bị ngắt và lý do.
- [ ] **Step 2: Vẽ layout** bằng script Tcl của Magic hoặc vẽ tay, lưu thành `.mag`.
  - Dùng 2 dải diffusion (n và p) theo thứ tự Euler.
  - Dùng luật DRC sky130 (`drc style drc(full)`).
  - Có ít nhất một tap `nwell` (n-tap nối VPWR) và một substrate tap (p-tap nối VGND) cho mỗi dải.
  - Khoảng cách từ mọi transistor tới tap gần nhất không vượt quá luật latch-up của sky130 (`LU.*`, ghi giá trị dùng trong `euler.md`).
- [ ] **Step 3: Viết `drc.tcl`**: `load fa_cell; select top cell; drc check; drc catchup; puts [drc listall count]`, sau đó `gds write`.
  - Chạy: `magic -dnull -noconsole -rcfile $PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc custom/fa/drc.tcl`.
  - Kỳ vọng: số lỗi DRC = 0.
- [ ] **Step 4: Viết `fa_stats.py`** để lấy bounding box (từ `property FIXED_BBOX` hoặc output `box`), đếm số transistor sau `extract` (phải bằng 28), và đếm tap. Ghi các key.
- [ ] **Step 5:** Render `fa_layout.png` bằng `gds2png.py`.
- [ ] **Step 6:** Commit `feat(custom): full-custom FA layout in magic, DRC clean, tapped`.

**Reviewer gate:**
```bash
python3 scripts/metrics.py check fa.drc_errors '==' 0 && python3 scripts/metrics.py check fa.ntrans '==' 28 && python3 scripts/metrics.py check fa.taps '>=' 2
grep -c 'Euler' custom/fa/euler.md
```
Ảnh `fa_layout.png`: reviewer mở ra xem bằng mắt.

---

### Task 13: LVS FA + PEX + mô phỏng sau layout + đối chiếu với LE

**Files:**
- Create: `custom/fa/lvs.sh`, `custom/fa/pex.tcl`, `custom/fa/sim/path_post.sp`, `analysis/le/compare.py`
- Generated: `custom/fa/out/fa_cell_pex.spice`, `results/logs/t13_lvs.txt`, `results/le_compare.csv`

**Interfaces:**
- Consumes: `fa_cell.mag` (Task 12); `fa_cell.spice` và `path_pre.sp` (Task 11); các key `le.*` và `fa.*`.
- Produces:
  - Các key `fa.lvs_match`, `fa.pex_cap_count`, `spice.D_pre_ps`, `spice.D_post_ps`, `le.err_pre_pct`, `le.err_post_pct`.
  - `le_compare.csv` có header `method,delay_ps,err_vs_post_pct`, gồm 3 dòng: `LE_estimate`, `SPICE_pre`, `SPICE_post`.

- [ ] **Step 1: LVS**
  - `extract all`; `ext2spice lvs`; `ext2spice -o out/fa_cell_lvs.spice`.
  - `netgen -batch lvs "custom/fa/out/fa_cell_lvs.spice fa_cell" "custom/fa/fa_cell.spice fa_cell" $PDK_ROOT/sky130A/libs.tech/netgen/sky130A_setup.tcl out/lvs.rpt`.
  - Kỳ vọng: report có `Circuits match uniquely.` Ghi `fa.lvs_match=true`, chép 30 dòng cuối report vào log.
- [ ] **Step 2: PEX**
  - `extract all`; `ext2spice cthresh 0 rthresh 0`; `ext2spice -o out/fa_cell_pex.spice`.
  - Giữ tên subckt `fa_cell` và đúng thứ tự cổng `A B CI S CO VPWR VGND`. Nếu Magic xếp thứ tự cổng khác, dùng tên cổng khi instance hoặc sửa thứ tự bằng script; không sửa tay file sinh ra.
  - Đếm số tụ ký sinh và ghi `fa.pex_cap_count`.
- [ ] **Step 3: Mô phỏng sau layout.** `path_post.sp` giống hệt `path_pre.sp`, chỉ khác là `.include` netlist PEX. Đo delay, ghi `spice.D_post_ps`; ghi lại `spice.D_pre_ps = fa.<chosen>.delay_pre_ps`.
- [ ] **Step 4: Viết `compare.py`**: tính sai số `err = (LE − SPICE) / SPICE × 100` cho pre và post, rồi ghi CSV và các key.
- [ ] **Step 5:** Commit `feat(custom): FA LVS, PEX and post-layout LE vs SPICE comparison`.

**Reviewer gate:**
```bash
grep 'Circuits match uniquely' results/logs/t13_lvs.txt
python3 scripts/metrics.py check spice.D_post_ps '>=' "$(python3 scripts/metrics.py get spice.D_pre_ps)"   # ký sinh làm chậm hơn (nếu sai: điều tra, không bỏ qua)
cat results/le_compare.csv
```

---

### Task 14: Hình vẽ cho tài liệu

**Files:**
- Create: `scripts/figs/` (mỗi hình một script `make_<name>.py`, dùng matplotlib cài trong `.venv`), `scripts/figs/vcd_plot.py`
- Generated: `docs/figures/*.png` (300 dpi, nền trắng, chữ trong hình bằng tiếng Anh để dùng chung cho paper, báo cáo và slide)

**Interfaces:**
- Consumes: `results/metrics.json`, `results/cmp.csv`, `results/le_compare.csv`, `verif/out/case2.vcd`, `verif/out/case4.vcd`, các ảnh layout (Task 9 và Task 12).
- Produces, đúng tên file sau (các task tài liệu tham chiếu theo tên):

| File | Nội dung |
|---|---|
| `block_diagram.png` | Datapath + FSM như Hình 1 của đề cương (vẽ lại bằng matplotlib/graphviz nếu có, các khối có nhãn) |
| `csla_struct.png` | Cấu trúc 2+2: RCA2 low, hi0, hi1, 3 MUX, tô màu đường `c2` |
| `fsm.png` | Sơ đồ 3 trạng thái, nhãn chuyển trạng thái và ngõ ra Moore |
| `wave_case2.png` | Sóng 12 chu kỳ đầu của case2: clk, valid_in, ready_out, data_in, valid_out, data_out |
| `wave_case4.png` | Sóng quanh thời điểm reset bất đồng bộ |
| `area_delay.png` | Biểu đồ cột hoặc scatter area–delay của 4 biến thể trong `cmp.csv` |
| `layout_top.png`, `fa_layout.png` | Đã có từ Task 9 và Task 12 (không vẽ lại) |
| `le_vs_spice.png` | Cột: LE_estimate, SPICE_pre, SPICE_post |
| `fa_transient.png` | Sóng A0, CO1 từ mô phỏng sau layout (xuất từ ngspice bằng `wrdata`) |

- [ ] **Step 1:** `vcd_plot.py`: nhận vào `vcd`, danh sách tín hiệu, khoảng thời gian, file out. Đọc VCD bằng gói `vcdvcd` (cài trong venv), vẽ dạng sóng số.
- [ ] **Step 2:** Viết từng script vẽ hình; target `make figures` chạy tất cả.
- [ ] **Step 3:** Commit `docs(figures): generate all report/paper figures`.

**Reviewer gate:**
```bash
make figures && ls docs/figures/{block_diagram,csla_struct,fsm,wave_case2,wave_case4,area_delay,layout_top,fa_layout,le_vs_spice,fa_transient}.png | wc -l   # 10
```
Reviewer mở từng ảnh xem bằng mắt: nhãn đọc được, không có ô trống, sóng `case2` thấy rõ khoảng cách 2 chu kỳ.

---

### Task 15: Bài báo IEEE (tiếng Anh, ≤ 4 trang)

**Files:**
- Create: `scripts/metrics_to_tex.py`, `paper/main.tex`, `paper/refs.bib`
- Generated: `paper/metrics.tex`, `paper/CarrySelect4_IEEE.pdf`
- Modify: `Makefile` (thêm target `paper`)

**Interfaces:**
- Consumes: `results/metrics.json`, `docs/figures/*.png`, `docs/DEVIATIONS.md`, `results/logs/t7.txt`.
- Produces:
  - **Script:** `metrics_to_tex.py` sinh ra:
    ```tex
    \expandafter\def\csname metric@<key>\endcsname{<value>}
    \newcommand{\metric}[1]{\ifcsname metric@#1\endcsname\csname metric@#1\endcsname\else\errmessage{missing metric #1}\fi}
    ```
    Số thực được làm tròn 3 chữ số có nghĩa; nếu value có `_` thì escape thành `\_`.
  - **Trong paper:** mọi con số đều viết dạng `\metric{pnr.wns_setup_ns}`. **Không được gõ tay số đo.**

- [ ] **Step 1: Viết `metrics_to_tex.py`** kèm một test nhỏ: key `a.b=1.23456` cho ra chuỗi chứa `{1.23}`.
- [ ] **Step 2: Viết `main.tex`** dùng `\documentclass[conference]{IEEEtran}`. Các mục:
  - Abstract (≤ 200 từ) và Index Terms.
  - **I. Introduction**
  - **II. Architecture**: CSLA 2+2, FSM, valid/ready; kèm `block_diagram`, `fsm`.
  - **III. Verification**: bảng Case 1–5 + kết quả; kèm `wave_case2`.
  - **IV. Synthesis & Physical Design**: bảng PPA; `area_delay`; `layout_top`.
  - **V. Full-Custom FA & Logical Effort**: các công thức G, B, H, F, f̂, D; bảng `le_compare`; `fa_layout`, `le_vs_spice`.
  - **VI. Conclusion**
  - **References**: Weste & Harris; Sklansky hoặc Bedrij (1962) về carry-select; SkyWater PDK; OpenLane 2; Yosys; OpenSTA; Magic; Sutherland và cộng sự, *Logical Effort*.
  - Phần tác giả theo Global Constraints.
- [ ] **Step 3: Build**
  - `make paper`, tức `python3 scripts/metrics_to_tex.py > paper/metrics.tex && tectonic paper/main.tex`, rồi đổi tên PDF.
  - Nếu vượt 4 trang: thu nhỏ hình (`width=\columnwidth`), gộp bảng. **Không** đổi lề hoặc font của IEEEtran.
- [ ] **Step 4:** Commit `docs(paper): IEEE 4-page paper with metrics-driven numbers`.

**Reviewer gate:**
```bash
make paper && pdfinfo paper/CarrySelect4_IEEE.pdf | grep Pages     # <= 4
pdftotext paper/CarrySelect4_IEEE.pdf - | grep -c '??'             # 0 (không có ref lỗi)
grep -nE '[0-9]+\.[0-9]+ ?(ns|ps|MHz|um|µm)' paper/main.tex | grep -v metric   # rỗng: không có số gõ tay
```

---

### Task 16: Báo cáo .docx: bộ dựng + Chương 1–3

**Files:**
- Create: `report/build_docx.mjs`, `report/package.json`, `report/vi/ch01_gioithieu.md`, `report/vi/ch02_coso.md`, `report/vi/ch03_thietke.md`, `report/vi/00_meta.json`
- Modify: `Makefile` (thêm target `report`)

**Interfaces:**
- Consumes: `results/metrics.json`, `docs/figures/*.png`.
- Produces:
  - **Lệnh dựng:** `node report/build_docx.mjs` ghép **tất cả** file `report/vi/ch*.md` theo thứ tự tên, rồi ghi ra `report/baocao_CarrySelect4.docx`.
  - **Các cú pháp markdown được hỗ trợ** (chỉ những thứ này):
    - `#`, `##`, `###` → Heading 1, 2, 3, đánh số tự động dạng "Chương 1", "1.1", "1.1.1";
    - đoạn văn thường; `- ` → bullet; `1. ` → danh sách số;
    - bảng dạng pipe → bảng có viền, kèm caption từ dòng `Bảng: <caption>` ngay phía trên;
    - `![Hình: caption](../../docs/figures/x.png)` → ảnh rộng 15 cm, caption đánh số "Hình n.";
    - `**đậm**`, `*nghiêng*`, `` `code` `` (font Consolas);
    - placeholder `{{key}}`: thay bằng giá trị trong metrics.json; nếu key không tồn tại thì **build thất bại** (thoát với mã 1).
  - **Trang bìa** lấy từ `00_meta.json`: trường, khoa, học phần, tên đề tài, nhóm, sinh viên, GVHD (để trống `"GVHD": ""` để người dùng tự điền), "Đà Nẵng, 2026". Có mục lục (TOC field).
  - **Định dạng:** Times New Roman 13pt, giãn dòng 1.3, lề T/B/L/R = 2/2/3/2 cm, khổ A4, có số trang ở footer.

- [ ] **Step 1:** Viết `build_docx.mjs` cùng một file test `report/vi/zz_selftest.md` có đủ mọi cú pháp và placeholder `{{sim.latency_cycles}}`. Build phải thành công.
- [ ] **Step 2:** Đổi placeholder trong file test thành `{{no.such}}`. Build phải thất bại với mã thoát 1. Sau đó xóa `zz_selftest.md`.
- [ ] **Step 3: Viết nội dung tiếng Việt**
  - **Ch1 Giới thiệu** (~2 trang): bối cảnh ALU/edge SoC; vấn đề trễ carry O(n); mục tiêu; phạm vi (gồm D-3, D-8); cấu trúc báo cáo.
  - **Ch2 Cơ sở lý thuyết** (~4 trang): RCA; CSLA (công thức trễ); handshake valid/ready; FSM Moore; Logical Effort (các công thức g, h, p, G, B, H, F, f̂, D); luồng RTL→GDSII trên sky130.
  - **Ch3 Thiết kế** (~4 trang): datapath, FSM (D-1, D-2), bảng pinout, thanh ghi; kèm `block_diagram`, `csla_struct`, `fsm`.
- [ ] **Step 4:** `make report`. Build thành công.
- [ ] **Step 5:** Commit `docs(report): docx builder and chapters 1-3`.

**Reviewer gate:**
```bash
make report && ls -la report/baocao_CarrySelect4.docx
unzip -p report/baocao_CarrySelect4.docx word/document.xml | grep -c 'Times New Roman'   # > 0
unzip -p report/baocao_CarrySelect4.docx word/document.xml | grep -c '{{'                # 0
```

---

### Task 17: Báo cáo, Chương 4–6

**Files:**
- Create: `report/vi/ch04_kiemchung.md`, `report/vi/ch05_tonghop.md`, `report/vi/ch06_physical.md`

**Interfaces:**
- Consumes:
  - **Bộ dựng** (Task 16): chỉ dùng đúng các cú pháp đã liệt kê.
  - **Dữ liệu:** các key `sim.*`, `synth.*`, `sta.*`, `cmp.*`, `pnr.*`, `pnr5.*`; các file `results/logs/t4.txt`, `t6_sta.txt`, `t7.txt`, `t8.txt`, `docs/DEVIATIONS.md`.

- [ ] **Step 1: Ch4 Kiểm chứng chức năng**
  - Kiến trúc TB, golden model, định dạng vector.
  - Bảng ma trận Case 1–5 + `case_illegal`, có cột kết quả dùng placeholder.
  - Bằng chứng mutation test.
  - Hình `wave_case2`, `wave_case4`, kèm phân tích latency và thông lượng theo D-4.
- [ ] **Step 2: Ch5 Tổng hợp & STA**
  - Script Yosys, SDC (D-7), bảng diện tích (cell, µm², NAND2-eq so với ngân sách 500).
  - Bảng STA: setup/hold, đường tới hạn (trích ≤ 15 dòng từ `t6_sta.txt`).
  - Mục **so sánh Area–Delay** CSLA và RCA: bảng `cmp`, hình `area_delay`. Phân tích trung thực theo `t7.txt`, gồm cả trường hợp bản flatten làm mất lợi thế cấu trúc.
- [ ] **Step 3: Ch6 Physical design**
  - Các bước trong OpenLane: floorplan (util, aspect), PDN, placement, CTS, routing.
  - Bảng sign-off: WNS theo corner, DRC Magic/KLayout, LVS, antenna, công suất, wirelength, fmax.
  - Hình `layout_top`. Kết quả chạy 5 ns (nếu có).
  - Mục "Sai khác so với đề cương": trình bày lại từng D<n> trong DEVIATIONS.md.
- [ ] **Step 4:** `make report`. Build thành công, không còn placeholder nào chưa thay.
- [ ] **Step 5:** Commit `docs(report): chapters 4-6 verification, synthesis, physical design`.

**Reviewer gate:**
```bash
make report
unzip -p report/baocao_CarrySelect4.docx word/document.xml | grep -c '{{'      # 0
grep -c '{{' report/vi/ch04_kiemchung.md report/vi/ch05_tonghop.md report/vi/ch06_physical.md   # mỗi file > 3 (có dùng số liệu)
```

---

### Task 18: Báo cáo, Chương 7–8 + hoàn thiện .docx

**Files:**
- Create: `report/vi/ch07_fullcustom_le.md`, `report/vi/ch08_ketluan.md`, `report/vi/ch09_tailieu_phuluc.md`

**Interfaces:**
- Consumes: bộ dựng (Task 16); các key `le.*`, `fa.*`, `spice.*`; `custom/fa/euler.md`; `results/le_compare.csv`; phần References của `paper/refs.bib`.

- [ ] **Step 1: Ch7 Full-custom FA & Logical Effort**
  - Mạch 28T, sizing S1/S2 và lý do chọn.
  - Euler path (tóm tắt từ `euler.md`), quy tắc vẽ layout, tap chống latch-up (giá trị luật đã dùng).
  - DRC/LVS, PEX.
  - Tính Logical Effort từng bước, với số liệu thật đặt qua placeholder: τ, pinv, G, B, H, F, f̂, D.
  - Bảng và hình `le_vs_spice`, `fa_transient`, `fa_layout`. Phân tích nguồn sai số.
- [ ] **Step 2: Ch8 Kết luận**
  - Đối chiếu từng mục tiêu PPA của đề cương thành bảng "Mục tiêu / Đạt được / Đánh giá".
  - Hạn chế; hướng phát triển (ví dụ ghép FA custom vào flow; CSLA nhiều tầng hơn).
  - Bảng phân công: ghi theo đề cương, A = Nguyễn Minh Anh Tú, B = Ngụy Quốc Trung. Đề cương chỉ ghi A/B, nên reviewer sẽ hỏi lại người dùng để xác nhận trước khi chốt. Tạm thời ghi "[cần xác nhận]".
- [ ] **Step 3: Ch9** gồm tài liệu tham khảo (định dạng IEEE) và phụ lục: cây thư mục repo, danh sách lệnh `make`, các script chính (chỉ liệt kê tên file, không dán code).
- [ ] **Step 4:** `make report`. Mở file `.docx` bằng python-docx hoặc unzip, đếm số heading cấp 1; kỳ vọng 9.
- [ ] **Step 5:** Commit `docs(report): chapters 7-9, final docx`.

**Reviewer gate:**
```bash
make report
unzip -p report/baocao_CarrySelect4.docx word/document.xml | grep -o 'Heading1' | wc -l   # 9 (tên style tùy docx-js; chấp nhận nếu đếm đúng 9 chương)
unzip -l report/baocao_CarrySelect4.docx | grep -c 'media/'     # >= 10 hình
```

---

### Task 19: Slide bảo vệ .pptx

**Files:**
- Create: `slides/build_slides.mjs`, `slides/package.json`
- Generated: `slides/CarrySelect4_BaoVe.pptx`

**Interfaces:**
- Consumes: `results/metrics.json`, `docs/figures/*.png`. Dùng pptxgenjs.
- Produces:
  - Một file `.pptx` tiếng Việt, 16:9, gồm 14–18 slide.
  - **Số liệu đọc từ `metrics.json` trong script, không gõ tay.** Key thiếu thì build lỗi.

- [ ] **Step 1: Dàn ý slide.** Mỗi slide tối đa 6 bullet; mỗi slide số liệu có một hình hoặc một bảng.
  1. Bìa
  2. Bối cảnh & mục tiêu
  3. Kiến trúc tổng thể
  4. CSLA 2+2
  5. FSM & handshake
  6. Kiểm chứng: ma trận case
  7. Sóng `case2`/`case4`
  8. Tổng hợp & STA
  9. So sánh CSLA và RCA
  10. Luồng OpenLane
  11. Layout & sign-off
  12. FA 28T & Euler
  13. Layout FA, DRC/LVS
  14. Logical Effort và SPICE
  15. Kết quả so với mục tiêu
  16. Kết luận & hướng phát triển
  17. Demo (lệnh `make sim TEST=case2`, mở GDS bằng KLayout)
  18. Q&A
- [ ] **Step 2:** Viết script build. Chạy `node slides/build_slides.mjs`.
- [ ] **Step 3:** Commit `docs(slides): defense deck`.

**Reviewer gate:**
```bash
node slides/build_slides.mjs && unzip -l slides/CarrySelect4_BaoVe.pptx | grep -cE 'ppt/slides/slide[0-9]+\.xml'   # 14..18
```

---

### Task 20: Đóng gói + kiểm tra toàn bộ

**Files:**
- Create: `scripts/verify_all.sh`, `DELIVERABLES.md`
- Modify: `Makefile` (thêm target `verify-all`, `package`), `README.md`

**Interfaces:**
- Consumes: tất cả task trước.
- Produces:
  - **`make verify-all`:** chạy lại `lint`, `sim-all`, `synth`, `sta`, `compare`, `le-test`, `paper`, `report`; sau đó chạy mọi lệnh `metrics.py check` của các gate T5–T13. Exit 0 nếu tất cả qua; nếu không, in ra từng check FAIL.
    - **Không** chạy lại `pnr`, vì quá lâu. Thay vào đó, so `sha256sum` của GDS trong `pnr/final/` với giá trị ghi trong `DELIVERABLES.md`.
  - **`make package`:** tạo `CarrySelect4_Nhom7.zip` (bỏ `.venv`, `node_modules`, `pnr/runs`, các thư mục `out/`).
  - **`DELIVERABLES.md`:** bảng ánh xạ deliverable theo guideline (mục VI trong file `.md`) sang đường dẫn file, kèm sha256 của GDS.

- [ ] **Step 1:** Viết `verify_all.sh` và target `make verify-all`.
- [ ] **Step 2:** Viết `DELIVERABLES.md` và cập nhật README: cách cài đặt, cách chạy từng bước, cây thư mục.
- [ ] **Step 3: Kiểm tra số liệu nhất quán**
  - Dùng một script nhỏ lấy 5 số chính (`pnr.wns_setup_ns`, `synth.top.nand2_eq`, `pnr.fmax_mhz`, `le.D_est_ps`, `spice.D_post_ps`) đã làm tròn.
  - Grep trong `pdftotext` của paper, trong text của docx (unzip + bỏ tag XML) và trong text của pptx. Mỗi số phải xuất hiện trong cả 3 tài liệu.
  - Riêng pptx: nếu slide không dùng số nào thì ghi chú lại.
- [ ] **Step 4:** Chạy `make verify-all && make package`.
- [ ] **Step 5:** Commit `chore: final verification and packaging`.

**Reviewer gate:**
```bash
make verify-all; echo EXIT=$?          # EXIT=0
ls -la CarrySelect4_Nhom7.zip paper/CarrySelect4_IEEE.pdf report/baocao_CarrySelect4.docx slides/CarrySelect4_BaoVe.pptx pnr/final/carryselect4_top.gds
```
