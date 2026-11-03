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

## D4: LibreLane lần đầu chạy native, số cuối cùng đo bằng image Docker chính thức
- Spec: `$FLOW_CLI --dockerized ...` với image LibreLane và PDK do ciel quản lý (hash `8afc8346…`).
- Thực tế: lần chạy đầu (môi trường cloud, không tải được image `ghcr.io/librelane/librelane` và bản phát hành ciel) dùng `--manual-pdk` với tool nixpkgs-unstable (Yosys 0.70, OpenROAD 26Q3, Magic 8.3.685, Netgen 1.5.325, KLayout 0.30.12) và PDK `open_pdks.sky130a 1.0.471`. Sau đó `make pnr` và `make pnr5` được chạy lại trên máy nhóm bằng `--dockerized`, image `ghcr.io/librelane/librelane:3.0.16`, PDK ciel `8afc8346…`. `scripts/run_pnr.sh` bọc lệnh bằng `script -qec` khi stdin không phải TTY (cần cho `docker run -it`).
- Lý do: lần chạy native chỉ là giải pháp tạm khi thiếu Docker; spec yêu cầu image chính thức.
- Ảnh hưởng: mọi số `pnr.*` và `pnr5.*` trong `results/metrics.json`, paper, báo cáo và slide là số chạy bằng image chính thức (`pnr/final/run_info.json` ghi chế độ và image). Các số của lần chạy native chỉ còn là lịch sử. Khác biệt lớn nhất: ở 5 ns thiết kế đạt timing ở cả 9 corner (`pnr5.status` = PASS), trong khi bản native trượt setup ở corner ss. `results/logs/t8.txt` được `scripts/parse_ol_metrics.py` sinh từ metrics của hai run, không viết tay.

## D5: Paper dựng bằng TeX Live (pdflatex + latexmk) thay cho tectonic
- Spec: `make paper` = `tectonic paper/main.tex`.
- Thực tế: target `paper` dùng `tectonic` nếu có trên máy; nếu không thì dùng `latexmk -pdf` của TeX Live (gói `ieeetran`, `cite`, `booktabs`, font `times`/`courier`/`helvetic`). Bản PDF trong repo được dựng bằng TeX Live 2025 từ nixpkgs.
- Lý do: tectonic tải bundle TeX từ `relay.fullyjustified.net` lúc chạy, host này bị chặn trong môi trường thực hiện Task 15.
- Ảnh hưởng: không đổi nội dung; cùng lớp `IEEEtran` (conference). Trên máy có tectonic, `make paper` vẫn dùng tectonic như spec.

## D6: `make verify-all` chạy lại vào bản sao metrics, không ghi đè số đã commit
- Spec: `make verify-all` chạy lại `synth`, `sta`, `compare`, … và số liệu phải nhất quán.
- Thực tế: `scripts/verify_all.sh` chạy lại vào một bản sao `results/metrics.json` (`results/out/verify_metrics.json`) và in danh sách số lệch so với bản đã commit; nó không ghi đè số mà paper, báo cáo và slide dùng. PnR không được chạy lại (quá lâu), thay vào đó so sha256 của GDS với `DELIVERABLES.md`.
- Lý do: để chạy lại không làm thay đổi số liệu đã công bố, và để thấy ngay nếu công cụ cho số khác.
- Ảnh hưởng: trong môi trường cloud (Yosys 0.70, liberty `open_pdks` 1.0.471) các số `cmp.*` của Task 7 lệch (CSLA-4 phân cấp 1.256 ns thay vì 1.242; RCA-4 phân cấp 1.654 ns thay vì 1.71; RCA-4 flatten 1.317 ns thay vì 2.005), đảo kết luận về bản flatten. Trên máy nhóm (Yosys 0.66, PDK ciel `8afc8346…`, image LibreLane 3.0.16) `make verify-all` cho phần drift là `none`: mọi số `cmp.*` trùng số đã commit. Vì vậy kết luận về bản flatten trong Task 7 đúng với bộ công cụ chính thức; chỉ bản chạy cloud mới lệch.
