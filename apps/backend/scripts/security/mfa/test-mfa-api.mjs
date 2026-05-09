/**
 * 手动测试 MFA API
 */

async function testMfaApi() {
  const baseUrl = 'http://localhost:3000';

  // 1. 先登录获取 token
  console.log('1. 登录...');
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test-admin-no-mfa',
      password: 'Test@123456',
    }),
  });

  if (!loginRes.ok) {
    console.error('登录失败:', loginRes.status, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  console.log('登录成功:', loginData.success);

  const accessToken = loginData.data.accessToken;
  console.log('Access Token:', accessToken ? '已获取' : '未获取');

  // 2. 调用 MFA 设置 API
  console.log('\n2. 生成 TOTP 密钥...');
  const mfaRes = await fetch(`${baseUrl}/api/v1/admin/me/mfa/setup/totp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  console.log('响应状态:', mfaRes.status);
  const mfaData = await mfaRes.json();
  console.log('响应数据:', JSON.stringify(mfaData, null, 2));

  if (mfaData.success) {
    console.log('\n✅ API 测试成功!');
    console.log('QR Code URL:', mfaData.data.qrCodeUrl ? '已生成' : '未生成');
    console.log('Secret:', mfaData.data.secret ? mfaData.data.secret : '未生成');
  } else {
    console.log('\n❌ API 测试失败!');
    console.log('错误:', mfaData.message);
  }
}

testMfaApi().catch(console.error);
