# Thiết kế vật lý

## Luồng OpenLane 2 / LibreLane

Thiết kế vật lý dùng LibreLane 3.0.16 (bản kế tục OpenLane 2) với file cấu hình `pnr/config.json`. Các thông số chính: `CLOCK_PERIOD = 10`, `FP_CORE_UTIL = 55`, `FP_ASPECT_RATIO = 1`, `SYNTH_HIERARCHY_MODE = keep` (giữ phân cấp CSLA, D-6), và `PNR_SDC_FILE` / `SIGNOFF_SDC_FILE` trỏ tới `syn/constraints.sdc`. Lệnh chạy: `make pnr` (`scripts/run_pnr.sh 10 run_10ns`).

Các bước chính của luồng:

1. **Tổng hợp và kiểm tra:** Yosys, lint, kiểm tra latch và cell không ánh xạ.
2. **Floorplan:** kích thước die theo utilization 55% và tỷ lệ 1:1; chèn tap cell và end cap.
3. **Mạng cấp nguồn (PDN):** lưới VPWR/VGND trên met4/met5 và rail met1 theo hàng cell.
4. **Placement:** đặt chân I/O, global placement, detailed placement.
5. **CTS:** tổng hợp cây clock và sửa timing sau CTS (chèn buffer).
6. **Routing:** global route, sửa antenna, detailed route, chèn fill/decap.
7. **Sign-off:** trích RC, STA ở 9 corner, DRC Magic và KLayout, LVS Netgen, xuất GDSII.

Flow chạy bằng `make pnr` ở chế độ `--dockerized` với image `ghcr.io/librelane/librelane:3.0.16` và PDK sky130A do ciel quản lý (hash `{{env.pdk_hash}}`). Mọi số `pnr.*` và `pnr5.*` trong tài liệu được đo bằng chế độ này (xem D4).

## Kết quả sign-off

Bảng: Kết quả sau đặt–đi dây ở chu kỳ 10 ns
| Chỉ số | Giá trị |
|---|---|
| Diện tích die (µm²) | {{pnr.die_area_um2}} |
| Số standard cell (gồm tap, không gồm fill) | {{pnr.cell_count}} |
| Utilization cuối (%) | {{pnr.core_util_pct}} |
| Setup slack ở tt / corner xấu nhất (ns) | {{pnr.wns_setup_ns}} / {{pnr.wns_setup_worst_corner_ns}} |
| Hold slack ở tt / corner xấu nhất (ns) | {{pnr.wns_hold_ns}} / {{pnr.wns_hold_worst_corner_ns}} |
| fmax ước lượng ở tt (MHz) | {{pnr.fmax_mhz}} |
| Lỗi DRC Magic / KLayout | {{pnr.drc_magic}} / {{pnr.drc_klayout}} |
| Lỗi LVS | {{pnr.lvs_errors}} |
| Vi phạm antenna | {{pnr.antenna_violations}} |
| Công suất tổng (mW) | {{pnr.power_total_mw}} |
| Chiều dài dây (µm) | {{pnr.wirelength_um}} |

Một số điểm cần giải thích:

- **Timing ở mọi corner:** setup và hold slack đều dương ở cả 9 corner (trích RC min/nom/max × ss/tt/ff), gồm cả corner chậm nhất `max_ss_100C_1v60`. Các kiểm tra recovery/removal của `rst_n` nằm trong nhóm đường `asynchronous` và đã được tính vào slack trên.
- **fmax** được ước lượng bằng 1000 / (10 − slack setup ở tt). Vì slack là worst slack (D1), đây là tần số tối đa ước lượng ở corner tt, không phải giá trị đã sign-off.
- **Utilization cuối** cao hơn mục tiêu 55% vì bước sửa timing chèn thêm buffer (chủ yếu ở ngõ vào và ngõ ra) sau floorplan; die vẫn được giữ theo kích thước tính lúc floorplan.

![Hình: Layout sau đi dây của carryselect4_top (LibreLane, SKY130)](../../docs/figures/layout_top.png)

## Chạy mở rộng ở 5 ns

{{pnr5.text_vi}}

## Sai khác so với đề cương

Mọi sai khác đều được ghi trong `docs/DEVIATIONS.md`:

- **D1 – "WNS" là worst slack:** các key `*.wns_*` lưu worst slack (dương khi đạt) thay cho WNS của OpenSTA, để biết còn dư bao nhiêu.
- **D2 – Đặt tên cell theo wire khi tổng hợp:** thêm `read_liberty -lib` và `rename -wire` để report STA đọc được; logic và diện tích không đổi.
- **D3 – Loại cell `lpflow_*`:** tránh dùng cell cách ly làm logic thường, giống cách LibreLane làm; số cell và diện tích không đổi.
- **D4 – Số liệu PnR cuối cùng đo bằng image chính thức:** lần chạy đầu trong môi trường không có Docker dùng tool native và PDK `open_pdks` 1.0.471; các số đó chỉ còn là lịch sử. Số trong tài liệu là số chạy lại bằng image LibreLane 3.0.16 và PDK ciel.
- **D5 – Paper dựng bằng TeX Live:** tectonic không tải được bundle; nội dung và lớp IEEEtran không đổi.
