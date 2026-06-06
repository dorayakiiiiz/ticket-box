// // src/payment/payment.service.ts
// import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
// import * as crypto from 'crypto';
// import * as CircuitBreaker from 'opossum';

// @Injectable()
// export class PaymentService {
//     private vnpayBreaker: CircuitBreaker;
//     constructor() {
//         // Cấu hình Circuit Breaker bọc hàm tạo link / kết nối VNPAY
//         const options = {
//             timeout: 5000, // Nếu quá 5s không phản hồi -> coi như lỗi
//             errorThresholdPercentage: 50, // Lỗi 50% số request -> OPEN mạch
//             resetTimeout: 30000 // Sau 30s mạch chuyển sang HALF-OPEN để thử lại
//         };

//         // Khởi tạo Circuit Breaker với hàm cốt lõi và cấu hình đã định nghĩa
//         this.vnpayBreaker = new CircuitBreaker(this.generateVnpayUrl.bind(this), options);
//         this.vnpayBreaker.fallback(() => {
//             throw new ServiceUnavailableException('Cổng thanh toán VNPAY hiện đang quá tải hoặc bảo trì. Vui lòng thử lại sau!');
//         });
//     }
//     // Hàm cốt lõi tạo URL theo chuẩn VNPAY Sandbox
//   private async generateVnpayUrl(order: { id: string; amount: number }, ipAddress: string): Promise<string> {
//     const tmnCode = process.env.VNP_TMNCODE;
//     const secretKey = process.env.VNP_HASHSECRET;
//     let vnpUrl = process.env.VNP_URL;
//     const returnUrl = process.env.VNP_RETURNURL; //Trang web của bạn mà VNPAY sẽ redirect trình duyệt quay về sau khi thanh toán xong -> FE hiển thị thanh toàn hoàn tất

//     //Định dạng thời gian tạo đơn theo đúng chuẩn VNPAY yêu cầu: yyyyMMddHHmmss
//     const date = new Date();
//     const createDate = date.toISOString().replace(/T/, '').replace(/\..+/, '').replace(/-|:/g, '');

//     let vnp_Params = {
//       vnp_Version: '2.1.0',
//       vnp_Command: 'pay',
//       vnp_TmnCode: tmnCode,
//       vnp_Locale: 'vn',
//       vnp_CurrCode: 'VND',
//       vnp_TxnRef: order.id, // Mã đơn hàng sinh từ Phase giups bạn dễ dàng đối chiếu khi VNPAY callback về
//       vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
//       vnp_OrderType: 'other',
//       vnp_Amount: order.amount * 100, // VNPAY tính theo đơn vị xu (VND * 100)
//       vnp_ReturnUrl: returnUrl,
//       vnp_IpAddr: ipAddress,
//       vnp_CreateDate: createDate,
//     };

//     // Sắp xếp các tham số theo bảng chữ cái Alphabet (bắt buộc theo luật VNPAY)
//     vnp_Params = this.sortObject(vnp_Params);

//     // Tiến hành mã hóa HMAC-SHA512 để tạo Chuỗi bảo mật vnp_SecureHash
//     const querystring = Object.keys(vnp_Params)
//       .map((key) => `${key}=${encodeURIComponent(vnp_Params[key])}`)
//       .join('&');

//     const hmac = crypto.createHmac('sha512', secretKey);
//     const signed = hmac.update(Buffer.from(querystring, 'utf-8')).digest('hex');
//     //signed để VNPay so khớp với vnp_SecureHash do bạn gửi lên, nếu khớp thì giao dịch hợp lệ, ngược lại sẽ bị từ chối
//     return `${vnpUrl}?${querystring}&vnp_SecureHash=${signed}`;
//   }

//     // Hàm wrapper để controller gọi
//     async getPaymentUrl(order: any, ipAddress: string) {
//         //Fire để Circuit Breaker quản lý, nếu có lỗi sẽ tự động gọi fallback
//         //Kích hoạt bộ đếm 5s được config ở trên, nếu quá 5s sẽ ngắt mạch và trả về lỗi ngay lập tức mà không cần chờ tiếp
//         //Gọi hàm generateVnpayUrl
//         return this.vnpayBreaker.fire(order, ipAddress);
//     }



//     // Hàm sắp xếp object theo key (bắt buộc theo luật VNPAY)
//   private sortObject(obj: any) {
//     const sorted = {};
//     const keys = Object.keys(obj).sort();
//     for (const key of keys) {
//       sorted[key] = obj[key];
//     }
//     return sorted;
//   }
// }


// //=====================================
// // src/payment/payment.controller.ts
// // Đây là controller xử lý callback từ VNPAY (IPN - Instant Payment Notification)
// import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
// import { Response } from 'express';
// import * as crypto from 'crypto';
// import { v4 as uuidv4 } from 'uuid';

// //VNPay chặn gửi tiền 2 lần bằng vnp_TxnRef, không thể nào bị trừ tiền lần 2 cho cùng 1 mã đơn hàng
// @Controller('payment')
// export class PaymentController {
  
//   @Get('webhook') // VNPAY IPN thường dùng phương thức GET kèm query params
//   async vnpayWebhook(@Query() query: any, @Res() res: Response) {
//     try {
//         // VNPAY sẽ gửi rất nhiều tham số về, trong đó có vnp_SecureHash dùng để xác thực tính hợp lệ của dữ liệu
//       const secureHash = query['vnp_SecureHash'];
      
//       // Bản sao params loại bỏ trường hash để tính toán lại Checksum
//       //Mục đích để tự tính toán lại Checksum từ dữ liệu gốc mà VNPAY gửi về,
//       //  sau đó so sánh với vnp_SecureHash để xác thực tính hợp lệ của dữ liệu
//       const vnp_Params = { ...query };
//       delete vnp_Params['vnp_SecureHash'];
//       delete vnp_Params['vnp_SecureHashType'];

//       //Sắp xếp lại tham số theo thứ tự bảng chữ cái để tính toán Checksum
//       //Làm lại i chang lúc sinh ra vnp_SecureHash ở hàm generateVnpayUrl, 
//       // đảm bảo thứ tự tham số giống hệt nhau để Checksum khớp
//       const sortedParams = this.sortObject(vnp_Params);
//       const signData = Object.keys(sortedParams)
//         .map((key) => `${key}=${encodeURIComponent(sortedParams[key])}`)
//         .join('&');

//       const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET);
//       const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

//       // 1. Kiểm tra tính hợp lệ của chữ ký
//       if (secureHash !== checkHash) {
//         return res.status(HttpStatus.OK).json({ RspCode: '97', Message: 'Invalid Checksum' });
//       }

//       const orderId = query['vnp_TxnRef'];
//       const responseCode = query['vnp_ResponseCode']; //Do hệ thống VnPay sinh ra

//       // Giả lập tìm kiếm Order trong Postgres từ Phase 3
//       const order = { id: orderId, status: 'PENDING' }; // Khởi tạo mẫu
//       if (!order) {
//         return res.status(HttpStatus.OK).json({ RspCode: '01', Message: 'Order not found' });
//       }
//       if (order.status !== 'PENDING') {
//         return res.status(HttpStatus.OK).json({ RspCode: '02', Message: 'Order already confirmed' });
//       }

//       // 2. Kiểm tra mã phản hồi (00 là thành công)
//       //Logic bảo vệ số vé không bị trừ oan hoặc bị trừ 2 lần:
//       // - Nếu resultCode là '00' (thành công), mới tiến hành cập nhật trạng thái đơn hàng thành PAID và cấp mã QR.
//       // - Nếu resultCode khác '00' (thất bại hoặc bị hủy), chỉ cập nhật trạng thái đơn hàng thành FAILED mà không động đến kho vé.
//       if (responseCode === '00') {
//         // UPDATE Order SET status = 'PAID' WHERE id = orderId
        
//         // Sinh chuỗi mã QR duy nhất cho từng VÉ thuộc đơn hàng này
//         const qrPayload = uuidv4();
//         // INSERT INTO tickets (order_id, qr_code_payload, status) VALUES (orderId, qrPayload, 'UNUSED')
//         //Ở đây tạo 1 payment service để sử dụng transaction giữa trừ tiền và tạo vé
//         // (Optional): Đẩy job vào email-queue để gửi mail QR code ngầm
        
//         return res.status(HttpStatus.OK).json({ RspCode: '00', Message: 'Confirm Success' });
//       } else {
//         // UPDATE Order SET status = 'FAILED' WHERE id = orderId
//         return res.status(HttpStatus.OK).json({ RspCode: '00', Message: 'Payment Failed acknowledged' });
//       }

//     } catch (error) {
//       return res.status(HttpStatus.OK).json({ RspCode: '99', Message: 'Unknown Error' });
//     }
//   }

//   private sortObject(obj: any) {
//     const sorted = {};
//     const keys = Object.keys(obj).sort();
//     for (const key of keys) {
//       sorted[key] = obj[key];
//     }
//     return sorted;
//   }
// }


// //Payment service có transaction
// import { Injectable, Logger } from '@nestjs/common';
// import { DataSource } from 'typeorm';
// import { v4 as uuidv4 } from 'uuid';
// import { Order } from '../entities/order.entity';
// import { Ticket } from '../entities/ticket.entity';

// @Injectable()
// export class PaymentService {
//   private readonly logger = new Logger(PaymentService.name);

//   constructor(
//     // 1. Inject DataSource của TypeORM vào để quản lý kết nối DB
//     private dataSource: DataSource, 
//   ) {}

//   async processWebhookSuccess(orderId: string) {
//     // 2. Tạo một QueryRunner để mở một luồng kết nối độc lập
//     const queryRunner = this.dataSource.createQueryRunner();

//     await queryRunner.connect();
//     // 3. BẮT ĐẦU TRANSACTION (Khóa van an toàn)
//     await queryRunner.startTransaction();

//     try {
//       // ⚠️ LƯU Ý QUAN TRỌNG: 
//       // Kể từ đây, mọi thao tác DB phải dùng `queryRunner.manager` 
//       // Tuyệt đối không dùng `this.orderRepo` ở đây vì nó sẽ nằm ngoài Transaction

//       // Bước 1: Khóa dòng Order này lại (Pessimistic Write) để tránh 2 Webhook tới cùng lúc cập nhật đè nhau
//       const order = await queryRunner.manager.findOne(Order, {
//         where: { id: orderId },
//         lock: { mode: 'pessimistic_write' }, 
//       });

//       if (!order || order.status !== 'PENDING') {
//         // Đơn không tồn tại hoặc đã xử lý rồi -> Hoàn tác và thoát
//         await queryRunner.rollbackTransaction();
//         return { status: 'IGNORED', message: 'Order already processed' };
//       }

//       // Bước 2: Cập nhật trạng thái Order thành PAID
//       order.status = 'PAID';
//       await queryRunner.manager.save(order);

//       // Bước 3: Sinh mã QR cho từng vé (Giả sử đơn này mua 2 vé)
//       const ticketsToCreate = [];
//       for (let i = 0; i < order.quantity; i++) {
//         const newTicket = queryRunner.manager.create(Ticket, {
//           orderId: order.id,
//           qrCodePayload: uuidv4(), // Sinh mã QR
//           status: 'UNUSED',
//         });
//         ticketsToCreate.push(newTicket);
//       }

//       // Mô phỏng hàm uuid bị crash hoặc lưu vé thất bại...
//       // throw new Error("Chết cha, lỗi tạo vé rồi!"); 

//       // Bước 4: Lưu đống vé vào DB
//       await queryRunner.manager.save(ticketsToCreate);

//       // 5. NẾU MỌI THỨ SUÔN SẺ -> CHỐT SỔ (Ghi vĩnh viễn xuống ổ cứng DB)
//       await queryRunner.commitTransaction();
//       this.logger.log(`Xử lý đơn ${orderId} thành công!`);
      
//       return { status: 'SUCCESS' };

//     } catch (error) {
//       // 6. NẾU CÓ BẤT KỲ LỖI GÌ -> QUAY XE (Hủy bỏ toàn bộ thao tác từ bước 1)
//       this.logger.error(`Lỗi xử lý đơn ${orderId}, đang Rollback...`, error.stack);
//       await queryRunner.rollbackTransaction();
      
//       // Quăng lỗi ra ngoài cho Controller trả về mã 99 cho VNPAY biết đường lát gọi lại
//       throw error; 
      
//     } finally {
//       // 7. Dọn dẹp: Bắt buộc phải giải phóng kết nối trả lại cho hệ thống, nếu không sẽ cạn kiệt Pool kết nối
//       await queryRunner.release();
//     }
//   }
// }




// //==============================
// // src/payment/cron.service.ts
// // src/payment/cron.service.ts
// //Kịch bản lỗi:
// // 1. Đổi trạng thái Postgres thành CANCELLED thành công.
// // 2. Server NestJS đột ngột bị crash (hoặc mất mạng với Redis) ngay trước khi kịp chạy lệnh pipeline.exec().
// // Hậu quả: 
// // - Postgres báo đơn đã HỦY.
// // - RAM Redis KHÔNG được cộng lại vé (Vé bị bốc hơi vĩnh viễn khỏi kho).
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import Redis from 'ioredis';

// // Định nghĩa đoạn mã Lua Script hoàn vé ngay tại RAM Redis
// const REFUND_TICKET_LUA = `
//   local ticket_key = KEYS[1]
//   local user_limit_key = KEYS[2]
//   local qty = tonumber(ARGV[1])

//   -- 1. Tăng lại kho vé khả dụng
//   redis.call('INCRBY', ticket_key, qty)

//   -- 2. Giảm số lượng vé user đang giữ (bảo vệ không để tụt xuống dưới 0)
//   local current_held = tonumber(redis.call('GET', user_limit_key) or '0')
//   if current_held >= qty then
//       redis.call('DECRBY', user_limit_key, qty)
//   else
//       redis.call('SET', user_limit_key, '0')
//   end

//   return 'SUCCESS'
// `;

// @Injectable()
// export class CronService {
//   private readonly logger = new Logger(CronService.name);
//   private redis: Redis;

//   constructor() {
//     this.redis = new Redis({ host: 'localhost', port: 6379 });
    
//     // Định nghĩa hàm gọi script trong ioredis để tối ưu hiệu năng
//     this.redis.defineCommand('refundTicketScript', {
//       numberOfKeys: 2,
//       lua: REFUND_TICKET_LUA,
//     });
//   }

//   // Định kỳ chạy mỗi 5 phút một lần để dọn dẹp hệ thống
//   @Cron(CronExpression.EVERY_5_MINUTES)
//   async handleExpiredOrders() {
//     this.logger.log('=== BẮT ĐẦU CRONJOB QUÉT VÀ DỌN DẸP ĐƠN HÀNG TREO ===');

//     const timeLimit = new Date(Date.now() - 15 * 60 * 1000); // Mốc 15 phút trước

//     try {
//       // BƯỚC 1: Xử lý an toàn trên Postgres trước
//       // Thực hiện đổi trạng thái đơn hàng PENDING quá hạn thành CANCELLED.
//       // Việc này giúp "chốt" trạng thái pháp lý, ngăn không cho Webhook của VNPAY/MoMo có cơ hội chuyển nó thành PAID nữa.
      
//       // Giả lập câu lệnh ORM thực tế:
//       // await this.orderRepository.update(
//       //   { status: 'PENDING', createdAt: LessThan(timeLimit) },
//       //   { status: 'CANCELLED' }
//       // );
//       this.logger.log('Đã cập nhật trạng thái các đơn hàng quá hạn thành CANCELLED trong Postgres.');

//       // BƯỚC 2: Tìm các đơn đã HỦY nhưng CHƯA ĐƯỢC HOÀN TRẢ VÉ LÊN REDIS
//       // Query này cực kỳ quan trọng, nó giúp hệ thống chạy lại được nếu lỡ server bị sập ở bước gọi Redis trước đó.
      
//       // Giả lập câu lệnh ORM thực tế:
//       // const expiredOrders = await this.orderRepository.find({
//       //   where: { status: 'CANCELLED', isRefundedToRedis: false }
//       // });
      
//       const expiredOrders = [
//         { id: 'order-123', userId: 'user-789', ticketTypeId: 'vip-01', quantity: 2 } // Data giả lập để test
//       ];

//       if (expiredOrders.length === 0) {
//         this.logger.log('Không có đơn hàng nào cần xả kho.');
//         return;
//       }

//       // BƯỚC 3: Vòng lặp xử lý xả kho an toàn tuyệt đối cho từng đơn hàng
//       for (const order of expiredOrders) {
//         try {
//           const ticketKey = `ticket_type:${order.ticketTypeId}:available`;
//           const userLimitKey = `user:${order.userId}:tickets_held`;

//           this.logger.log(`Đang tiến hành xả kho nguyên tử trên RAM Redis cho đơn hàng: ${order.id}`);

//           // Gọi Lua Script đã khai báo ở trên để thực thi việc hoàn vé nguyên tử (Atomic)
//           // Ép kiểu ép method qua any để ioredis hiểu hàm tự định nghĩa
//           const result = await (this.redis as any).refundTicketScript(
//             ticketKey,
//             userLimitKey,
//             order.quantity
//           );

//           if (result === 'SUCCESS') {
//             // BƯỚC 4: Sau khi RAM Redis đã tăng lại số lượng vé thành công,
//             // Cập nhật lại cờ kiểm tra chéo dưới Postgres thành TRUE để kết thúc chu kỳ.
            
//             // Giả lập câu lệnh ORM thực tế:
//             // await this.orderRepository.update({ id: order.id }, { isRefundedToRedis: true });
            
//             this.logger.log(`[Thành công] Đã xả xong đơn ${order.id}. Đã đồng bộ Postgres & Redis kho vé.`);
//           }

//         } catch (redisOrDbError) {
//           // Nếu xử lý đơn này lỗi (ví dụ: mất kết nối mạng với Redis), 
//           // Cờ 'isRefundedToRedis' vẫn sẽ là FALSE dưới Postgres.
//           // Ở chu kỳ 5 phút sau, Cronjob chạy lại sẽ tiếp tục nhặt đơn này lên xử lý lại. Hệ thống tự sửa lỗi!
//           this.logger.error(`Lỗi cục bộ khi hoàn vé cho đơn ${order.id}: ${redisOrDbError.message}`);
//         }
//       }

//     } catch (globalError) {
//       this.logger.error(`Lỗi hệ thống trong quá trình chạy Cronjob: ${globalError.message}`);
//     }
//   }
// }

// //=====================================
// //Tích hợp thêm momo
// //Refactor code dùng Factory Pattern để dễ dàng mở rộng thêm cổng 
// // thanh toán mới như MoMo trong tương lai mà không cần sửa code cũ nhiều, 
// // chỉ cần thêm class mới implement interface chung và đăng ký vào Factory là xong.
// //Interface chung: Tạo ra một interface IPaymentStrategy có hàm chung là getPaymentUrl(order, ip).

// //Cả VnpayService và MomoService đều phải implements IPaymentStrategy.

// //PaymentFactory: Tạo ra một Service trung gian nhận vào tham số
// //  method (VNPAY/MOMO) từ client gửi lên để quyết định sẽ gọi đến Service tương ứng nào.
// //Sửa thêm DTO CreatePaymentDto để client gửi lên thông tin cần thiết như orderId và paymentMethod (VNPAY hoặc MOMO).

// //Controller sẽ gọi duy nhất vào PaymentFactory để lấy URL thanh toán,
// @Post('create-url')
// async createPaymentUrl(@Body() dto: CreatePaymentDto, @Req() req: Request) {
//   // Dto chứa: orderId, paymentMethod ('VNPAY' hoặc 'MOMO')
//   const order = await this.orderService.findById(dto.orderId);
  
//   // Factory tự động trả về đúng service xử lý mà Controller không cần quan tâm chi tiết bên trong
//   const paymentService = this.paymentFactory.getService(dto.paymentMethod); 
  
//   const url = await paymentService.getPaymentUrl(order, req.ip);
//   return { url };
// }

// //Tạo momo service (giống hệt vnpay service nhưng implement theo chuẩn API của MoMo, cũng có Circuit Breaker riêng để đảm bảo tính ổn định)
// // src/payment/momo.service.ts
// import { Injectable, HttpService } from '@nestjs/common';
// import * as crypto from 'crypto';
// import * as CircuitBreaker from 'opossum';
// import { firstValueFrom } from 'rxjs';

// @Injectable()
// export class MomoService inplements IPaymentStrategy {
//   private momoBreaker: CircuitBreaker;

//   constructor(private readonly httpService: HttpService) {
//     const options = { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30000 };
//     this.momoBreaker = new CircuitBreaker(this.generateMomoUrl.bind(this), options);
//     // fallback báo lỗi cổng MoMo bảo trì...
//   }

//   async getPaymentUrl(order: any) {
//     return this.momoBreaker.fire(order);
//   }

//   private async generateMomoUrl(order: { id: string; amount: number }): Promise<string> {
//     // 1. Chuẩn bị các trường dữ liệu theo quy định của MoMo (partnerCode, orderId, requestId, ...)
//     // 2. Tạo chữ ký số HMAC-SHA256 kết hợp giữa chuỗi tham số thô và MOMO_SECRET_KEY
//     const signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(rawSignatureStr).digest('hex');

//     // 3. Thực hiện lệnh gọi HTTP POST thực tế sang Server MoMo (Khác VNPAY ở chỗ này)
//     const payload = { ...params, signature };
//     const response = await firstValueFrom(
//       this.httpService.post(process.env.MOMO_API_URL, payload)
//     );

//     // MoMo trả về kết quả, bạn lấy trường payUrl để gửi về cho khách
//     return response.data.payUrl; 
//   }
// }

// //-------------------------------
// //Webhook cho momo
// import { Controller, Post, Body, Res, HttpStatus, Logger } from '@nestjs/common';
// import { Response } from 'express';
// import * as crypto from 'crypto';
// import { v4 as uuidv4 } from 'uuid';

// @Controller('payment')
// export class PaymentController {
//   private readonly logger = new Logger(PaymentController.name);

//   @Post('momo-webhook') // MoMo gửi IPN/Webhook ngầm qua phương thức POST
//   async momoWebhook(@Body() body: any, @Res() res: Response) {
//     this.logger.log('--- Nhận Webhook ngầm (IPN) từ MoMo Sandbox ---');
    
//     try {
//       // BƯỚC 1: Trích xuất signature (chữ ký số) và các tham số cốt lõi từ body do MoMo gửi sang
//       const { signature, amount, orderId, requestId, resultCode, transId, responseTime, message, partnerCode, extraData } = body;
//       const secretKey = process.env.MOMO_SECRET_KEY;

//       // BƯỚC 2: Tái cấu trúc chuỗi Văn bản thô (Raw Signature String) để chuẩn bị băm lại.
//       // LUẬT MOMO: Thứ tự các trường khi nối chuỗi bắt buộc phải chuẩn xác 100% theo thứ tự dưới đây.
//       // Thiếu 1 trường hoặc đổi chỗ 2 trường cho nhau là lệch hash ngay lập tức.
//       const rawSignatureStr = 
//         `accessKey=${process.env.MOMO_ACCESS_KEY}` +
//         `&amount=${amount}` +
//         `&extraData=${extraData || ''}` +
//         `&message=${message}` +
//         `&orderId=${orderId}` +
//         `&partnerCode=${partnerCode}` +
//         `&requestId=${requestId}` +
//         `&responseTime=${responseTime}` +
//         `&resultCode=${resultCode}` +
//         `&transId=${transId}`;
      
//       // Tiến hành dùng Secret Key băm lại chuỗi bằng thuật toán HMAC-SHA256 (VNPAY dùng SHA512)
//       const checkSignature = crypto
//         .createHmac('sha256', secretKey)
//         .update(rawSignatureStr)
//         .digest('hex');

//       // Thực hiện so khớp chữ ký kiểm tra tính toàn vẹn dữ liệu
//       if (signature !== checkSignature) {
//         this.logger.error('Chữ ký MoMo không hợp lệ! Nghi vấn request giả mạo.');
//         // Trả về lỗi 400 Bad Request nếu chữ ký lệch
//         return res.status(HttpStatus.BAD_REQUEST).send('Invalid Signature'); 
//       }

//       this.logger.log(`Chữ ký hợp lệ! Đang xử lý đơn hàng: ${orderId}`);

//       // BƯỚC 3: Đối chiếu trạng thái đơn hàng dưới Postgres (Giả lập tìm kiếm dữ liệu từ Phase 3)
//       // Logic kiểm tra chéo tương tự VNPAY: Đơn hàng phải tồn tại và đang ở trạng thái PENDING
//       const order = { id: orderId, status: 'PENDING' }; // Khởi tạo mẫu để hình dung

//       if (!order) {
//         this.logger.warn(`Không tìm thấy đơn hàng ${orderId} trong hệ thống.`);
//         return res.status(HttpStatus.OK).send(); // Vẫn trả về 200 theo luật MoMo để họ không gọi lại nữa
//       }

//       if (order.status !== 'PENDING') {
//         this.logger.warn(`Đơn hàng ${orderId} đã được xử lý trước đó (Status: ${order.status}).`);
//         return res.status(HttpStatus.OK).send();
//       }

//       // BƯỚC 4: Kiểm tra resultCode (Mã lỗi của MoMo: 0 nghĩa là Khách đã bị trừ tiền thành công)
//       if (resultCode === 0) {
//         this.logger.log(`Đơn hàng ${orderId} thanh toán qua MoMo THÀNH CÔNG. Tiến hành duyệt vé.`);
        
//         // 1. Thực hiện Transaction trong Postgres:
//         // UPDATE orders SET status = 'PAID' WHERE id = orderId;
        
//         // 2. Cấp mã QR độc nhất cho từng chiếc vé trong đơn hàng
//         const qrPayload = uuidv4();
//         // INSERT INTO tickets (order_id, qr_code_payload, status) VALUES (orderId, qrPayload, 'UNUSED');
        
//         // 3. (Optional) Ném tiếp một Job vào email-queue của BullMQ để hệ thống tự động gửi mail QR Code ngầm ở background

//       } else {
//         // Khách hàng bấm hủy thanh toán, tài khoản không đủ tiền hoặc giao dịch bị lỗi trên ví MoMo
//         this.logger.warn(`Giao dịch MoMo thất bại hoặc bị hủy. Mã lỗi: ${resultCode}, Tin nhắn: ${message}`);
        
//         // UPDATE orders SET status = 'FAILED' WHERE id = orderId;
//       }

//       // BƯỚC 5: Phản hồi về cho MoMo biết Server bạn đã xử lý xong xuôi
//       // Tài liệu MoMo Sandbox quy định luồng IPN chỉ cần phản hồi về HTTP Status là 204 No Content (hoặc 200 OK với body trống)
//       return res.status(HttpStatus.NO_CONTENT).send();

//     } catch (error) {
//       this.logger.error(`Lỗi hệ thống khi xử lý Webhook MoMo: ${error.message}`);
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
//     }
//   }
// }











