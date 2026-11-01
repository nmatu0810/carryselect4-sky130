# Cơ sở lý thuyết

## Full Adder và bộ cộng nối tiếp nhớ (RCA)

Full Adder (FA) cộng ba bit *a*, *b*, *c*. Hai ngõ ra là tổng *s = a ⊕ b ⊕ c* và nhớ *c_o = ab + c(a + b)*, tức hàm đa số (majority) của ba bit vào.

Một RCA *n* bit ghép *n* Full Adder nối tiếp: ngõ nhớ của FA thứ *i* là ngõ nhớ vào của FA thứ *i + 1*. Gọi *t_c* là trễ từ nhớ vào tới nhớ ra của một FA và *t_s* là trễ tới ngõ tổng, độ trễ xấu nhất của RCA xấp xỉ:

*t_RCA ≈ (n − 1)·t_c + t_s*

Độ trễ tăng tuyến tính theo *n*. Ưu điểm của RCA là đơn giản và nhỏ: chỉ cần *n* Full Adder.

## Bộ cộng carry-select (CSLA)

CSLA chia toán hạng thành nhiều khối. Khối thấp nhất là một RCA bình thường nhận nhớ vào thật. Mỗi khối cao hơn được nhân đôi: một bản tính với nhớ vào bằng 0, bản kia với nhớ vào bằng 1. Khi nhớ thật từ khối thấp tới, một hàng MUX chọn kết quả đúng.

Với cách chia 2+2 của đề tài, độ trễ xấp xỉ:

*t_CSLA ≈ t_RCA2 + t_MUX*

trong đó *t_RCA2* là trễ của RCA 2 bit (khối thấp) và *t_MUX* là trễ từ chân chọn tới ngõ ra của MUX. Hai khối cao tính song song với khối thấp nên không nằm trên đường tới hạn. So với RCA 4 bit, CSLA bỏ được hai tầng lan nhớ nhưng thêm một tầng MUX, và tốn thêm một RCA 2 bit cùng 3 MUX.

## Giao tiếp bắt tay valid/ready

Giao tiếp valid/ready là cách phổ biến để hai khối truyền dữ liệu mà không cần biết trước tốc độ của nhau:

- Phía gửi đặt dữ liệu lên `data_in` và bật `valid_in`.
- Phía nhận báo sẵn sàng bằng `ready_out`.
- Một giao dịch xảy ra tại cạnh lên của clock khi cả hai tín hiệu cùng bằng 1.

Ở đầu ra, `valid_out = 1` báo `data_out` đang hợp lệ. Vì thiết kế không có `ready_in` từ phía nhận, kết quả được coi là đã nhận ngay trong chu kỳ `valid_out = 1` (quyết định D-3).

## Máy trạng thái Moore

Trong máy Moore, ngõ ra chỉ phụ thuộc trạng thái hiện tại, không phụ thuộc trực tiếp vào ngõ vào. Ưu điểm là ngõ ra ổn định trong cả chu kỳ và không có đường tổ hợp từ ngõ vào tới ngõ ra, giúp ghép nối các khối dễ hơn và tránh glitch. Bộ điều khiển của đề tài dùng FSM Moore 3 trạng thái, mã hóa 2 bit.

## Logical Effort

Logical Effort (Sutherland, Sproull và Harris) mô hình độ trễ của một cổng theo đơn vị *τ*, là trễ của một inverter lý tưởng không có ký sinh khi tải bằng chính nó:

*d = g·h + p*

trong đó:

- *g* (logical effort): tỷ số giữa điện dung vào của cổng và của inverter cho cùng dòng ra; inverter có *g = 1*, cổng đa số (carry gate) của mirror adder có *g = 2*.
- *h = C_out / C_in* (electrical effort): tỷ số giữa tải và điện dung vào.
- *p* (parasitic delay): trễ do điện dung ký sinh của chính cổng; inverter có *p_inv* xấp xỉ 1.

Với một đường *N* tầng:

- *G = ∏ gᵢ* là logical effort của đường.
- *B = ∏ bᵢ* là branching effort, với *bᵢ = (C_trên đường + C_rẽ nhánh) / C_trên đường*.
- *H = C_load / C_in* là electrical effort của cả đường.
- *F = G·B·H* là path effort.

Độ trễ nhỏ nhất đạt được khi mọi tầng có cùng effort *f̂ = F^(1/N)*, khi đó:

*D = N·F^(1/N) + P*, với *P = Σ pᵢ*.

Kích thước tối ưu được tính ngược từ tải: *C_in,i = gᵢ·bᵢ·C_in,i+1 / f̂*. Trong đề tài, *τ* được đặc trưng bằng mô phỏng inverter FO4 (fanout 4): theo mô hình trên FO4 = *g·h + p* = 4 + *p_inv*, xấp xỉ 5*τ*.

## Luồng RTL→GDSII trên SKY130

Luồng thiết kế dùng các công cụ mã nguồn mở:

1. **RTL và kiểm chứng:** SystemVerilog, mô phỏng bằng Verilator, mô hình tham chiếu bằng Python.
2. **Tổng hợp:** Yosys ánh xạ RTL sang cell của thư viện `sky130_fd_sc_hd` (ABC cho phần logic tổ hợp).
3. **Phân tích thời gian tĩnh:** OpenSTA với file ràng buộc SDC dùng chung.
4. **Thiết kế vật lý:** OpenLane 2 / LibreLane gồm floorplan, mạng cấp nguồn (PDN), đặt cell, cây clock (CTS), sửa timing, đi dây, trích ký sinh, STA nhiều corner, DRC (Magic, KLayout), LVS (Netgen) và xuất GDSII.
5. **Full-custom:** Magic vẽ layout và trích netlist, Netgen so LVS, Ngspice mô phỏng với mô hình transistor của PDK.
