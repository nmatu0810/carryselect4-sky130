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

## D4: Task 8 chạy LibreLane bằng tool native thay cho `--dockerized`
- Spec: `$FLOW_CLI --dockerized ...` với image LibreLane và PDK do ciel quản lý (hash `8afc8346…`).
- Thực tế: môi trường chạy Task 8 (cloud container) không tải được image `ghcr.io/librelane/librelane` và bản phát hành ciel (bị proxy chặn). Flow chạy với `--manual-pdk`, tool lấy từ nixpkgs-unstable (Yosys 0.70, OpenROAD 26Q3/OpenSTA, Magic 8.3.685, Netgen 1.5.325, KLayout 0.30.12), PDK `open_pdks.sky130a 1.0.471` (conda litex-hub). `scripts/run_pnr.sh` chọn `--dockerized` nếu `OL_IMAGE` có giá trị, nếu không thì chạy native (thêm venv vào `PATH`/`PYTHONPATH` cho các tool có Python nhúng).
- Lý do: không có cách nào khác để chạy flow trong môi trường này; LibreLane 3.0.16 vẫn đọc được cấu hình PDK cũ qua `libs.tech/openlane`. `scripts/olsh` cũng chạy `sta` native khi không có image.
- Ảnh hưởng: các số `pnr.*` có thể lệch nhẹ so với chạy bằng image chính thức. Trên máy có image, `make pnr` vẫn chạy chế độ dockerized như spec; nếu chạy lại thì thay `pnr/final/` và cập nhật lại số liệu Task 9.

## D5: Paper dựng bằng TeX Live (pdflatex + latexmk) thay cho tectonic
- Spec: `make paper` = `tectonic paper/main.tex`.
- Thực tế: target `paper` dùng `tectonic` nếu có trên máy; nếu không thì dùng `latexmk -pdf` của TeX Live (gói `ieeetran`, `cite`, `booktabs`, font `times`/`courier`/`helvetic`). Bản PDF trong repo được dựng bằng TeX Live 2025 từ nixpkgs.
- Lý do: tectonic tải bundle TeX từ `relay.fullyjustified.net` lúc chạy, host này bị chặn trong môi trường thực hiện Task 15.
- Ảnh hưởng: không đổi nội dung; cùng lớp `IEEEtran` (conference). Trên máy có tectonic, `make paper` vẫn dùng tectonic như spec.

## D6: `make verify-all` ở môi trường khác cho số Task 7 khác
- Spec: `make verify-all` chạy lại `synth`, `sta`, `compare`, … và số liệu phải nhất quán.
- Thực tế: `scripts/verify_all.sh` chạy lại vào một bản sao `results/metrics.json` (`results/out/verify_metrics.json`) và in danh sách số lệch so với bản đã commit, không ghi đè số mà paper/báo cáo/slide dùng. Trong cloud container (Yosys 0.70, liberty của `open_pdks` 1.0.471, xem D4), tổng hợp `carryselect4_top` cho đúng số cũ (49 cell, 817.034 µm²), mọi gate T5–T13 vẫn PASS, nhưng các số `cmp.*` của Task 7 đổi: CSLA-4 phân cấp 1.256 ns (cũ 1.242), RCA-4 phân cấp 1.654 ns (cũ 1.71), và RCA-4 flatten 1.317 ns (cũ 2.005), khiến kết luận "CSLA flatten nhanh hơn RCA flatten" đảo ngược.
- Lý do: phiên bản Yosys/ABC và file liberty khác nhau; bản flatten phụ thuộc nhiều vào cách ABC ánh xạ.
- Ảnh hưởng: số đã commit (đo trên máy nhóm, Yosys 0.66, PDK `8afc8346…`) được giữ làm số chính thức. Kết luận về bản **phân cấp** (CSLA nhanh hơn nhưng ADP kém hơn) đúng ở cả hai môi trường; kết luận về bản **flatten** cần nêu là phụ thuộc công cụ. Nên chạy `make verify-all` trên máy nhóm để xác nhận phần "drift" rỗng.
