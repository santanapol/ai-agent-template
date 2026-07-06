import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics สำหรับทำกราฟแยก
const responseTimeTrend = new Trend('api_commission_response_time');
const errorRate = new Rate('api_commission_errors');

// Test Configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up: ไต่ระดับคนเข้าเว็บเป็น 50 คนใน 30 วิ
    { duration: '1m', target: 200 },  // Peak: อัดคนเข้าไป 200 คน ค้างไว้ 1 นาที
    { duration: '30s', target: 0 },   // Ramp down: ค่อยๆ ลดคนออก
  ],
  thresholds: {
    // 95% ของ Request ต้องตอบกลับเร็วกว่า 500ms
    http_req_duration: ['p(95)<500'],
    // 99% ของ Request ต้องตอบกลับเร็วกว่า 1000ms
    http_req_duration: ['p(99)<1000'],
    // Error ต้องไม่เกิน 1%
    'api_commission_errors': ['rate<0.01'], 
  },
};

export default function () {
  // Simulate user calling the calculation API
  const url = 'https://api.staging.myplatform.com/api/v1/rolling-statement/calculate';
  const payload = JSON.stringify({ userId: `user_${Math.floor(Math.random() * 1000)}` });
  const params = { headers: { 'Content-Type': 'application/json' } };

  const res = http.post(url, payload, params);
  
  // บันทึก Metrics
  responseTimeTrend.add(res.timings.duration);
  errorRate.add(res.status >= 400);

  // Assertions (Checks)
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid payload': (r) => r.json('status') === 'SUCCESS',
  });
  
  // หน่วงเวลาจำลองพฤติกรรมมนุษย์ (Think time)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}
