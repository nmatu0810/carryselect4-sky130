# Kiểm chứng chức năng

## Kiến trúc testbench

Kiểm chứng dùng testbench SystemVerilog tự kiểm tra (`verif/tb/tb_top.sv`), biên dịch và chạy bằng Verilator ở chế độ `--binary --timing`. Testbench gồm các thành phần:

- **Bộ phát kích thích:** các task `send` và `idle` lái `valid_in`, `data_in` đồng bộ theo clock, chỉ đổi dữ liệu khi không có giao dịch được nhận.
- **Scoreboard:** mỗi giao dịch được nhận (`valid_in & ready_out = 1` tại cạnh lên) đẩy kết quả mong đợi vào hàng đợi; mỗi lần `valid_out = 1` lấy một phần tử ra và so với `data_out`.
- **Monitor giao thức:** kiểm tra độ trễ đúng 2 chu kỳ, khoảng cách giữa hai lần nhận, `valid_out` không xuất hiện khi scoreboard rỗng và `data_out` không đổi giữa hai xung `valid_out`.
- **Watchdog:** dừng mô phỏng với lỗi nếu testbench bị treo.

Mỗi kịch bản in một dòng `RESULT <case> PASS|FAIL checked=<n> errors=<m>`; Makefile đọc dòng này và ghi trạng thái vào `results/metrics.json`. Lệnh chạy: `make sim TEST=<case>`, hoặc `make sim-all` để chạy tất cả.

## Mô hình tham chiếu và vector

Mô hình tham chiếu là script Python độc lập (`verif/golden/golden.py`), có test riêng bằng pytest. Script sinh hai file vector dạng hex:

- `case1.hex`: 6 bộ ba (*a*, *b*, *cin*) có hướng, gồm các góc như 0 + 0 + 0 và 15 + 15 + 1.
- `exhaustive.hex`: đủ 512 tổ hợp của *a* (4 bit), *b* (4 bit) và *cin* (1 bit).

Mỗi dòng là một word 14 bit: 9 bit cao là `data_in = {cin, b, a}`, 5 bit thấp là kết quả mong đợi `{cout, sum}`. Testbench đọc file bằng `$readmemh`, nên kết quả mong đợi luôn đến từ mô hình Python chứ không do testbench tự tính.

## Ma trận kịch bản

Bảng: Các kịch bản kiểm chứng và kết quả
| Case | Kịch bản | Điểm kiểm tra chính | Kết quả |
|---|---|---|---|
| 1 | Vector có hướng sau reset | giá trị biên, giao dịch đơn lẻ | {{sim.case1.status}} |
| 2 | Giao dịch liên tiếp (`valid_in` luôn bằng 1) | độ trễ, thông lượng, `data_out` giữ nguyên | {{sim.case2.status}} |
| 3 | Bong bóng ngẫu nhiên 30% trên `valid_in` | không mất, không lặp giao dịch | {{sim.case3.status}} |
| 4 | Reset bất đồng bộ ở COMPUTE và ở DONE | không có `valid_out` giả sau reset | {{sim.case4.status}} |
| 5 | Vét cạn {{sim.exhaustive.checked}} tổ hợp | {{sim.exhaustive.errors}} lỗi so với mô hình tham chiếu | {{sim.case5.status}} |
| illegal | Ép FSM vào trạng thái `2'b11` | về IDLE sau một cạnh, không phát `valid_out` | {{sim.case_illegal.status}} |

Kiểm tra đơn vị riêng cho khối tổ hợp `csla4` (so với `rca4` tham chiếu) cũng duyệt {{sim.unit_csla4.checked}} tổ hợp với {{sim.unit_csla4.errors}} lỗi.

## Bằng chứng mutation test

Để chứng minh testbench thực sự phát hiện lỗi, nhóm cố ý sửa sai RTL (mutation) rồi chạy lại, sau đó khôi phục file gốc bằng `git checkout`:

Bảng: Kết quả mutation test (trích `results/logs/t4.txt`, `t5.txt`)
| Đột biến | Kịch bản | Kết quả |
|---|---|---|
| Đảo chân chọn của `mux2` | case5 | FAIL, 512/512 sai |
| `valid_out = DONE \| COMPUTE` | case1 | FAIL: sai độ trễ, `valid_out` khi scoreboard rỗng |
| `ready_out = 1` | case2, case3 | FAIL: khoảng cách nhận sai, sai dữ liệu |
| `out_en = 1` và `ld_en = 1` | case2, case3 | FAIL: `data_out` đổi khi không có `valid_out` |
| Xóa nhánh `default` của FSM | case_illegal | FAIL: không về IDLE, `valid_out` giả |
| `default: state_next = state` | case_illegal | FAIL: kẹt ở `2'b11`, watchdog dừng |

Riêng đột biến chỉ đặt `out_en = 1` vẫn PASS. Đây là đột biến tương đương: thanh ghi vào chỉ đổi khi có giao dịch được nhận, nên nạp thanh ghi ra mỗi chu kỳ vẫn cho cùng dạng sóng `data_out`. Nhóm ghi nhận điều này thay vì sửa testbench để "bắt" một lỗi không quan sát được.

## Dạng sóng, độ trễ và thông lượng

Hình 4 là 12 chu kỳ đầu của case 2. Giao dịch đầu tiên được nhận tại cạnh 55 ns (cạnh *k*), `valid_out` được lấy mẫu bằng 1 tại cạnh *k + 2* = 75 ns, đúng định nghĩa ở quyết định D-4. Khi `valid_in` giữ bằng 1, FSM luân phiên COMPUTE và DONE: độ trễ đo được là {{sim.latency_cycles}} chu kỳ và cứ {{sim.cycles_per_result}} chu kỳ có một kết quả.

![Hình: Dạng sóng case 2: giao dịch liên tiếp, độ trễ 2 chu kỳ, 1 kết quả mỗi 2 chu kỳ](../../docs/figures/wave_case2.png)

Hình 5 là case 4. Ở lần (a), `rst_n` xuống 0 khi FSM đang ở COMPUTE: giao dịch đang xử lý bị hủy, FSM về IDLE và thanh ghi ra bị xóa. Ở lần (b), reset xảy ra khi đang ở DONE với `valid_out = 1`: `valid_out` tắt ngay lập tức (reset bất đồng bộ) và không có xung giả nào sau khi nhả reset.

![Hình: Dạng sóng case 4: reset bất đồng bộ (a) ở COMPUTE và (b) ở DONE](../../docs/figures/wave_case4.png)
