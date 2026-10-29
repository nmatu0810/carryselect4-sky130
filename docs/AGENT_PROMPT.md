# Mẫu prompt giao task cho agent thực thi

Chỉ cần đổi `<N>`, rồi copy nguyên khối dưới đây.

---

## Prompt giao task (dùng cho mọi task)

```
Bạn là agent thực thi cho project CarrySelect-4 (đồ án cuối kỳ VLSI).
Thư mục làm việc: /home/tus/workspace/VKU/VLSI/CarrySelect4

NHIỆM VỤ: thực hiện đúng và chỉ Task <N> trong
docs/superpowers/plans/2026-10-20-carryselect4.md

ĐỌC (chỉ những phần này, không đọc task khác):
1. Mục "Quy tắc cho agent thực thi"
2. Mục "Global Constraints"
3. Mục "Design Decisions"
4. Mục "Review Focus" (để biết test nào thuộc task của bạn)
5. Bảng "Bảng key của results/metrics.json"
6. Toàn bộ mục "### Task <N>"
Nếu Task <N> có "Consumes" trỏ tới file của task trước thì được đọc các file đó.

CÁCH LÀM:
- Làm lần lượt các Step theo thứ tự, đánh dấu [x] trong file plan khi xong mỗi step.
- Có bước test thì phải thấy test FAIL trước, rồi mới viết code cho PASS.
- Mọi lệnh shell đều phải `source scripts/env.sh` trước (từ Task 1 trở đi).
- Không cài tool, không dùng sudo, không sửa nội dung plan (trừ việc đánh dấu [x]).
- Không làm sang task khác, kể cả khi thấy "tiện thì làm luôn".
- Làm khác plan thì phải ghi vào docs/DEVIATIONS.md đúng mẫu trong plan.
- Một gate không qua sau 3 lần sửa thì DỪNG và báo BLOCKED. Không được nới gate.

KHI XONG, trả lời đúng mẫu sau (không thêm gì khác):

## Task <N> — DONE | BLOCKED
### Files
- (danh sách file tạo/sửa)
### Reviewer gate
(dán nguyên lệnh và output của từng lệnh trong phần "Reviewer gate" của task;
 mỗi lệnh chỉ dán tối đa 20 dòng cuối của output)
### Metrics đã ghi
(output của: python3 scripts/metrics.py get <key> cho từng key task này ghi)
### Deviations
(các mục D<n> mới thêm vào DEVIATIONS.md, hoặc "Không có")
### Commit
(output của: git log --oneline -1)
### Ghi chú / vướng mắc
(tối đa 5 dòng)
```

---

## Prompt nạp ngữ cảnh cho agent sửa lỗi (gửi TRƯỚC prompt sửa lỗi, trong phiên mới)

```
Bạn là agent SỬA LỖI cho project CarrySelect-4 (đồ án cuối kỳ VLSI: bộ cộng
Carry-Select 4-bit, đi từ RTL tới GDSII trên sky130, kèm phân tích Logical Effort).
Thư mục làm việc: /home/tus/workspace/VKU/VLSI/CarrySelect4

Cách project vận hành:
- Có một plan chia task: docs/superpowers/plans/2026-10-20-carryselect4.md
- Một agent khác đã làm Task <N>. Reviewer đã kiểm tra và tìm ra lỗi.
- Việc của bạn: CHỈ sửa các lỗi reviewer nêu, trong phạm vi Task <N>.
  Không làm task khác, không viết lại những phần không bị nêu lỗi.

Bây giờ hãy nạp ngữ cảnh, CHƯA sửa gì:
1. Đọc trong file plan các mục: "Quy tắc cho agent thực thi", "Global Constraints",
   "Design Decisions", "Bảng key của results/metrics.json", và toàn bộ "### Task <N>".
   (Mục Task <N> có thể vừa được reviewer cập nhật. Bản trong file là bản đúng.)
2. Chạy: git log --oneline -5 ; git show --stat HEAD ; git status --short
3. Đọc các file mà Task <N> tạo ra hoặc sửa (danh sách nằm ở "Files" của task).

Sau đó trả lời NGẮN (tối đa 10 dòng):
- Task <N> nhằm tạo ra gì, các Interfaces chính là gì
- Những file hiện có và trạng thái git
- Bạn đã sẵn sàng nhận danh sách lỗi

Không chạy lệnh sửa đổi file nào ở bước này.
```

---

## Prompt sửa lỗi (khi reviewer trả task về)

```
Task <N> chưa qua review. Đây là các lỗi reviewer tìm thấy:

<dán phần nhận xét của reviewer>

Chỉ sửa đúng các lỗi trên, trong phạm vi Task <N>, theo cùng quy tắc như lúc giao task.
Sau khi sửa: chạy lại TOÀN BỘ Reviewer gate của Task <N>, commit với message
"fix(task<N>): <tóm tắt>", rồi trả lời theo đúng mẫu báo cáo như lần trước.
```

---

## Lưu ý cho người điều phối

- **Mỗi task một phiên agent mới** (hoặc `/clear` trước khi giao). Không giao nhiều task trong một phiên, vì context sẽ phình và agent dễ lẫn các task với nhau.
- **Thứ tự chạy:** T0 → T1 → … theo sơ đồ phụ thuộc. Hai nhánh T1–T9 (số) và T10–T13 (full-custom) có thể giao cho 2 agent chạy song song, sau khi T0 đã qua review.
- **Quy trình mỗi task:** agent báo cáo → gửi báo cáo cho reviewer → reviewer tự chạy lại gate → PASS thì giao task kế, FAIL thì dùng "Prompt sửa lỗi".
- **Task chạy lâu** (T8 LibreLane cỡ vài phút; T12 vẽ layout): báo agent chạy lệnh dài ở chế độ background và chỉ đọc `tail` của log.
- **Task 12 (vẽ layout Magic)** là task khó nhất với agent. Nếu agent BLOCKED vì DRC, có thể chia nhỏ: vẽ carry gate trước, sum gate sau, ghép lại cuối.
