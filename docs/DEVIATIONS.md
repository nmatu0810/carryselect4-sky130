# Project Deviations

This file tracks intentional deviations from the original spec or Design Decisions.

Format:
```markdown
## D<n>: <tiêu đề>
- Spec: ...
- Thực tế: ...
- Lý do: ...
- Ảnh hưởng: ...
```

## D1: "WNS" ghi là worst slack
- Spec: `sta.synth.wns_setup_ns` / `wns_hold_ns` là WNS của OpenSTA (`report_wns`).
- Thực tế: OpenSTA in `wns = 0.00` khi không có slack âm, nên hai key này lưu **worst slack** (`report_worst_slack -max/-min`), dương khi đạt timing. Parser đối chiếu worst slack với slack của đường xấu nhất trong report.
- Lý do: WNS = 0 không phân biệt được còn dư bao nhiêu, và gate `>= 0` vẫn đúng ý (âm = vi phạm).
- Ảnh hưởng: mọi key `*.wns_*` ở các task sau (T7, T8, T9) cũng hiểu là worst slack.

## D2: Đặt tên cell theo wire khi tổng hợp
- Spec: `synth.ys` gồm `hierarchy`, `synth`, `dfflibmap`, `abc`, `opt_clean`, `stat`, `write_verilog -noattr`.
- Thực tế: thêm `read_liberty -lib` + `rename -wire` sau `opt_clean`, và `write_verilog -noattr -norename`.
- Lý do: không có bước này FF tên là `_28_`, report STA không cho biết đường đi qua `a_q/b_q/cin_q` hay `sum_q/cout_q`. `read_liberty -lib` chỉ nạp blackbox (cần để Yosys biết hướng cổng của cell sky130); logic và diện tích không đổi (đã so với bản không đổi tên: 49 cell, 817.034 µm²).
- Ảnh hưởng: tên instance trong netlist có dạng `a_q[0]\sky130_fd_sc_hd__dfrtp_1`; `parse_synth.py` cắt phần sau dấu `\`.

## D3: Loại cell `lpflow_*` khỏi ánh xạ công nghệ
- Spec: `dfflibmap -liberty $LIB_TT` và `abc -liberty $LIB_TT` không có tùy chọn loại cell.
- Thực tế: thêm `-dont_use sky130_fd_sc_hd__lpflow_*` vào cả `dfflibmap` và `abc`.
- Lý do: ABC đã map 3 cell `sky130_fd_sc_hd__lpflow_isobufsrc_1` (isolation cell cho power gating) làm logic thường trong `csla4_ctrl`. LibreLane cũng loại các cell `lpflow_*`, nên cách này nhất quán với Task 8.
- Ảnh hưởng: ABC dùng `nor2b_1` thay thế; số cell (49) và diện tích (817.034 µm²) không đổi. `grep -c lpflow syn/out/carryselect4_top.syn.v` = 0.
