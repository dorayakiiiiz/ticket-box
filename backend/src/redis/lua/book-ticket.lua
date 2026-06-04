-- ============================================================
-- Lua Script: Atomic Ticket Booking (Phase 3)
-- ============================================================
-- Chạy nguyên tử trên Redis đơn luồng — không ai chen ngang
-- được trong khi script đang chạy, đảm bảo không bán lố (oversell)
--
-- KEYS[1] = ticket_type:{ticketTypeId}:available  (số vé còn lại)
-- KEYS[2] = user:{userId}:ticket_type:{ticketTypeId}:tickets_held  (số vé user này đã mua của Loại vé nà)
--
-- ARGV[1] = quantity (số vé muốn mua)
-- ARGV[2] = maxPerUser (giới hạn tối đa mỗi user cho loại vé này)
--
-- Return: 'SUCCESS' | 'SOLD_OUT' | 'LIMIT_EXCEEDED'
-- ============================================================

local ticket_key = KEYS[1]
local user_limit_key = KEYS[2]

local qty = tonumber(ARGV[1])
local max_per_user = tonumber(ARGV[2])

-- Bước 1: Kiểm tra user đã mua bao nhiêu vé cho event này
-- Nếu key chưa tồn tại, GET trả nil → dùng '0' làm fallback
local user_bought = tonumber(redis.call('GET', user_limit_key) or '0')
if (user_bought + qty) > max_per_user then
    return 'LIMIT_EXCEEDED'
end

-- Bước 2: Kiểm tra số vé còn lại trong Redis
local available = tonumber(redis.call('GET', ticket_key) or '0')
if available < qty then
    return 'SOLD_OUT'
end

-- Bước 3: Đủ điều kiện — tiến hành trừ vé + tăng counter user
-- Hai lệnh này chạy atomic, không request nào chen ngang được
redis.call('DECRBY', ticket_key, qty)
redis.call('INCRBY', user_limit_key, qty)

return 'SUCCESS'
