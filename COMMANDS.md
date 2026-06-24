# Команды Mogg Analyzer

Прод: `https://looks-maxing.ru`

## Railway

```powershell
cd C:\Users\Ural\Desktop\looksmaxxing
railway login
railway up --detach --service looksmaxxing
railway variables
railway logs --service looksmaxxing
```

## Админ (PowerShell)

**Важно:** `ADMIN_SECRET` смотри в Railway Variables — копируй **целиком**, без опечаток.

```powershell
$admin = @{
  "x-admin-secret" = "ТВОЙ_ADMIN_SECRET_ИЗ_RAILWAY"
  "Content-Type" = "application/json"
}
$base = "https://looks-maxing.ru/api/admin"
```

### Список пользователей

```powershell
Invoke-RestMethod -Uri "$base/users?limit=50" -Headers @{ "x-admin-secret" = "ТВОЙ_SECRET" }
```

### Начислить mogги по email

```powershell
$body = '{"email":"user@mail.ru","moggs":5}'
Invoke-RestMethod -Uri "$base/add-moggs" -Method POST -Headers $admin -Body $body
```

### Начислить по userId

```powershell
$body = '{"userId":"uuid","moggs":5}'
Invoke-RestMethod -Uri "$base/add-moggs" -Method POST -Headers $admin -Body $body
```

### Зачислить платёж из ЮKassa

```powershell
$body = '{"paymentId":"id-из-юкассы"}'
Invoke-RestMethod -Uri "$base/fulfill-payment" -Method POST -Headers $admin -Body $body
```

### Посмотреть заказ

```powershell
Invoke-RestMethod -Uri "$base/order/97" -Headers @{ "x-admin-secret" = "ТВОЙ_SECRET" }
```

## Локальная разработка

```powershell
npm run install:all
npm run dev
npm run build
npm run start
```

## ЮKassa webhook

```
https://looks-maxing.ru/api/payment/webhook
```

Событие: `payment.succeeded`
