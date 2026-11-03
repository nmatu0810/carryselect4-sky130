# Cơ sở lý thuyết

## Full Adder và bộ cộng nối tiếp nhớ (RCA)

Full Adder (FA) cộng ba bit *a*, *b*, *c*. Ngõ ra tổng là *s = a ⊕ b ⊕ c*, ngõ ra nhớ là *c_o = ab + c(a + b)*, chính là hàm đa số (majority) của ba bit vào.

RCA *n* bit ghép *n* FA nối tiếp, ngõ nhớ ra của FA thứ *i* đi vào ngõ nhớ vào của FA thứ *i + 1*. Gọi *t_c* là trễ từ nhớ vào tới nhớ ra của một FA và *t_s* là trễ tới ngõ tổng, thì trường hợp xấu nhất của RCA xấp xỉ:

*t_RCA ≈ (n − 1)·t_c + t_s*

Trễ tăng tuyến tính theo *n*. Đổi lại RCA rất nhỏ, chỉ cần đúng *n* Full Adder.

## Bộ cộng carry-select (CSLA)

CSLA chia toán hạng thành nhiều khối. Khối thấp nhất là một RCA bình thường, nhận nhớ vào thật. Mỗi khối cao hơn được làm hai bản: một bản tính với nhớ vào bằng 0, một bản với nhớ vào bằng 1. Khi nhớ thật của khối thấp tới nơi, một hàng MUX chọn bản đúng.

Với cách chia 2+2 của đề tài, độ trễ xấp xỉ:

*t_CSLA ≈ t_RCA2 + t_MUX*

*t_RCA2* là trễ của RCA 2 bit ở khối thấp, *t_MUX* là trễ từ chân chọn tới ngõ ra của MUX. Hai khối cao chạy song song với khối thấp nên không nằm trên đường tới hạn. So với RCA 4 bit, CSLA bớt được hai tầng lan nhớ nhưng thêm một tầng MUX, và phải trả thêm một RCA 2 bit cùng 3 MUX.

## Giao tiếp bắt tay valid/ready

Với valid/ready, hai khối truyền dữ liệu cho nhau mà không cần biết trước tốc độ của nhau. Bên gửi đặt dữ liệu lên `data_in` và bật `valid_in`. Bên nhận báo sẵn sàng bằng `ready_out`. Một giao dịch xảy ra ở cạnh lên clock mà tại đó cả hai tín hiệu cùng bằng 1.

Ở đầu ra, `valid_out = 1` cho biết `data_out` đang hợp lệ. Thiết kế không có `ready_in` từ phía nhận, nên nhóm coi kết quả đã được nhận ngay trong chu kỳ `valid_out = 1` (quyết định D-3).

## Máy trạng thái Moore

Trong máy Moore, ngõ ra chỉ phụ thuộc trạng thái hiện tại. Vì vậy ngõ ra ổn định suốt chu kỳ và không có đường tổ hợp từ ngõ vào sang ngõ ra, nối với các khối khác dễ hơn và ít glitch hơn. Bộ điều khiển của đề tài là FSM Moore 3 trạng thái, mã hóa bằng 2 bit.

## Logical Effort

Logical Effort (Sutherland, Sproull và Harris) tính độ trễ của một cổng theo đơn vị *τ*, là trễ của một inverter lý tưởng không có ký sinh khi tải bằng chính nó:

*d = g·h + p*

*g* (logical effort) là tỷ số giữa điện dung vào của cổng và điện dung vào của inverter cho cùng dòng ra. Inverter có *g = 1*, còn cổng đa số (carry gate) của mirror adder có *g = 2*. *h = C_out / C_in* (electrical effort) là tỷ số giữa tải và điện dung vào. *p* (parasitic delay) là trễ do điện dung ký sinh của chính cổng; inverter có *p_inv* xấp xỉ 1.

Với đường *N* tầng, ta có *G = ∏ gᵢ*, *B = ∏ bᵢ* (branching effort, *bᵢ = (C_trên đường + C_rẽ nhánh) / C_trên đường*), *H = C_load / C_in* và path effort *F = G·B·H*. Độ trễ nhỏ nhất đạt được khi mọi tầng có cùng effort *f̂ = F^(1/N)*:

*D = N·F^(1/N) + P*, với *P = Σ pᵢ*.

Kích thước tối ưu tính ngược từ tải: *C_in,i = gᵢ·bᵢ·C_in,i+1 / f̂*. Trong đề tài, *τ* được đo bằng mô phỏng inverter FO4 (fanout 4). Theo mô hình trên, FO4 = *g·h + p* = 4 + *p_inv*, tức khoảng 5*τ*.

## Luồng RTL→GDSII trên SKY130

Cả luồng dùng công cụ mã nguồn mở. Nhóm viết RTL bằng SystemVerilog, mô phỏng bằng Verilator và dùng mô hình tham chiếu bằng Python để kiểm tra. Yosys tổng hợp RTL sang cell của thư viện `sky130_fd_sc_hd`, trong đó ABC lo phần logic tổ hợp. OpenSTA phân tích thời gian tĩnh với một file SDC dùng chung cho tổng hợp và đặt–đi dây. OpenLane 2 / LibreLane làm phần vật lý: floorplan, mạng cấp nguồn (PDN), đặt cell, cây clock (CTS), sửa timing, đi dây, trích ký sinh, STA nhiều corner, DRC (Magic, KLayout), LVS (Netgen) và xuất GDSII. Nhánh full-custom dùng Magic để vẽ layout và trích netlist, Netgen để so LVS, và Ngspice với mô hình transistor của PDK để mô phỏng.
