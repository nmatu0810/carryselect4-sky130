# Giới thiệu

## Bối cảnh

Bộ cộng có mặt ở hầu hết khối số học trong bộ xử lý: ALU, tính địa chỉ, bộ đếm chương trình. Nó được nhân bản nhiều lần trên chip, nên chọn cấu trúc bộ cộng là chọn cách cân giữa tốc độ, diện tích và công suất.

Nhóm làm một lõi cộng 4 bit theo cấu trúc carry-select (CSLA), có giao tiếp bắt tay valid/ready và thanh ghi ở vào/ra. Lõi này được đưa qua toàn bộ luồng mã nguồn mở trên công nghệ SkyWater SKY130: RTL, kiểm chứng, tổng hợp, phân tích thời gian tĩnh, đặt–đi dây và xuất GDSII. Song song với luồng standard cell, nhóm tự vẽ tế bào Full Adder 28 transistor (full-custom) là phần tử cơ bản của bộ cộng, ước lượng trễ của nó bằng Logical Effort rồi so với mô phỏng SPICE trước và sau layout.

## Vấn đề trễ của chuỗi nhớ

Trong bộ cộng nối tiếp nhớ (Ripple-Carry Adder, RCA), bit nhớ đi lần lượt qua từng Full Adder. Bit thứ *i* chỉ có tổng khi nhớ từ bit *i − 1* đã tới, nên trễ tăng tuyến tính theo số bit, O(*n*). Đó cũng là đường tới hạn của bộ cộng.

Bộ cộng carry-select tránh việc chờ này bằng cách tính trước phần bit cao cho cả hai giá trị nhớ vào (0 và 1). Khi nhớ thật của phần bit thấp tới nơi, bộ dồn kênh (MUX) chọn kết quả đúng. Phần bit cao chạy song song với phần bit thấp, đổi lại nó phải làm hai bản nên tốn thêm diện tích.

## Mục tiêu

Đề cương đặt ra các mục tiêu sau:

- Thiết kế lõi `carryselect4_top`: CSLA 4 bit chia 2+2, thanh ghi vào 9 bit, thanh ghi ra 5 bit và FSM Moore 3 trạng thái điều khiển giao tiếp valid/ready.
- Kiểm chứng tự động, đạt 512/512 tổ hợp vào khớp mô hình tham chiếu, cùng các kịch bản giao thức (bong bóng `valid_in`, reset bất đồng bộ, trạng thái không hợp lệ).
- Tổng hợp bằng thư viện `sky130_fd_sc_hd` với diện tích không quá 500 cổng NAND2 tương đương.
- Đóng timing ở chu kỳ 10 ns (100 MHz) sau đi dây, ở mọi corner. Mục tiêu mở rộng là 5 ns.
- Sign-off sạch: DRC (Magic và KLayout) bằng 0, LVS khớp, có file GDSII.
- So sánh diện tích–độ trễ giữa CSLA-4 và RCA-4.
- Vẽ layout full-custom cho Full Adder 28T theo luật DRC sky130, có tap chống latch-up, DRC = 0, LVS khớp; trích ký sinh, mô phỏng và đối chiếu với Logical Effort.

## Phạm vi và giả định

Giao tiếp không có `ready_in` từ phía nhận (quyết định D-3), nên nhóm giả định phía nhận luôn lấy kết quả ngay khi `valid_out = 1`.

Full Adder full-custom chỉ là bài nghiên cứu cho leaf cell (quyết định D-8). Nó không được ghép vào luồng OpenLane, luồng đó chỉ dùng standard cell của `sky130_fd_sc_hd`.

Mọi số liệu trong báo cáo được đọc tự động từ `results/metrics.json`, do các script của dự án ghi ra. Nhờ vậy báo cáo, bài báo và slide luôn dùng cùng một bộ số.

## Cấu trúc báo cáo

Chương 2 nhắc lại cơ sở lý thuyết: RCA, CSLA, valid/ready, FSM Moore, Logical Effort và luồng RTL→GDSII. Chương 3 mô tả thiết kế RTL, chương 4 là kiểm chứng. Chương 5 trình bày tổng hợp, phân tích thời gian tĩnh và so sánh CSLA với RCA. Chương 6 là thiết kế vật lý bằng OpenLane 2 / LibreLane. Chương 7 nói về Full Adder full-custom và Logical Effort. Chương 8 kết luận, chương 9 gồm tài liệu tham khảo và phụ lục.
