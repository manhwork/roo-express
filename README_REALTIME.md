# Hướng dẫn sử dụng Dashboard Realtime với Socket.IO

## Tổng quan

Dự án đã được tích hợp Socket.IO để hiển thị dữ liệu realtime cho trang dashboard. Khi có thay đổi trong database, dashboard sẽ tự động cập nhật mà không cần refresh trang.

## Cài đặt và chạy

### 1. Server (roo-express)

```bash
cd roo-express
npm install socket.io
npm run dev
```

### 2. Client (roo-films)

```bash
cd roo-films
npm install socket.io-client
npm run dev
```

## Tính năng

### 1. Kết nối realtime

-   Dashboard tự động kết nối với Socket.IO server khi load trang
-   Hiển thị trạng thái kết nối (xanh = đã kết nối, đỏ = mất kết nối)
-   Hiển thị thời gian cập nhật lần cuối

### 2. Cập nhật dữ liệu tự động

Khi có thay đổi trong database thông qua các API:

-   POST /users - Thêm user mới
-   PUT /users/:id - Cập nhật user
-   DELETE /users/:id - Xóa user
-   POST /contents - Thêm content mới
-   PUT /contents/:id - Cập nhật content
-   DELETE /contents/:id - Xóa content

Dashboard sẽ tự động nhận và cập nhật dữ liệu mới.

### 3. Nút làm mới thủ công

-   Nút "Làm mới dữ liệu" để request dữ liệu mới từ server
-   Chỉ hoạt động khi đã kết nối realtime

### 4. Test endpoint

```bash
POST http://localhost:3000/test/realtime
```

Endpoint này để test việc emit dữ liệu realtime.

## Cấu trúc dữ liệu

### DashboardReportData interface

```typescript
interface DashboardReportData {
    monthlyViews?: Array<{ month: number; views: number }>;
    last30DaysViews?: Array<{ views: number }>;
    topMovies?: Array<{ title: string; views: number }>;
    topRatedMovies?: Array<{ title: string; rating: number }>;
    topLikedMovies?: Array<{ title: string; likes: number }>;
    genreViews?: Array<{ genre: string; views: number }>;
    ratingStats?: Array<{ rating: number; count: number }>;
    topUsers?: Array<{ username: string; views: number }>;
    avgWatchtime?: Array<{ username: string; avgWatchtime: number }>;
    engagementType?: any;
    deviceType?: any;
    browsers?: any;
    timeline?: any;
    heatmap?: any;
    topCountries?: any;
    userLocation?: any;
    summary?: {
        totalMovies: number;
        totalUsers: number;
        totalViews: number;
    };
}
```

## Socket.IO Events

### Server -> Client

-   `dashboard:update` - Emit dữ liệu dashboard mới

### Client -> Server

-   `dashboard:request-update` - Request dữ liệu mới từ server

## Fallback

Nếu không thể kết nối Socket.IO, dashboard sẽ fallback về fetch API thông thường để đảm bảo vẫn hiển thị được dữ liệu.

## Troubleshooting

### 1. Không kết nối được Socket.IO

-   Kiểm tra server có đang chạy không
-   Kiểm tra CORS configuration
-   Kiểm tra port 3000 có bị block không

### 2. Dữ liệu không cập nhật

-   Kiểm tra console browser có lỗi gì không
-   Kiểm tra server logs
-   Thử nút "Làm mới dữ liệu"

### 3. Performance

-   Socket.IO sử dụng polling fallback nếu WebSocket không khả dụng
-   Dữ liệu được cache và chỉ cập nhật khi có thay đổi thực sự
