# 🚀 Руководство по развертыванию ARTBAT Prague

## 📋 Обзор архитектуры

### Основной сайт
- **Платформа**: Vercel (статический хостинг + CDN)
- **Преимущества**: Бесплатно, быстро, автоматические деплои
- **URL**: `https://your-project.vercel.app`

### Админка
- **Платформа**: Railway/Render (Node.js хостинг)
- **Преимущества**: Бесплатно, автоматические деплои, SSL
- **URL**: `https://your-admin.railway.app`

## 🛠️ Подготовка к деплою

### 1. Установка зависимостей
```bash
npm install
```

### 2. Оптимизация изображений
```bash
npm run build
```

### 3. Тестирование локально
```bash
npm run dev
# Откройте http://localhost:8000
```

## 🚀 Деплой основного сайта на Vercel

### Автоматический деплой (рекомендуется)

1. **Подключите GitHub репозиторий к Vercel:**
   - Зайдите на [vercel.com](https://vercel.com)
   - Войдите через GitHub
   - Нажмите "New Project"
   - Выберите ваш репозиторий `artbat-prague`

2. **Настройте проект:**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (корень проекта)
   - **Build Command**: `npm run build`
   - **Output Directory**: `./` (корень проекта)

3. **Переменные окружения:**
   ```
   NODE_ENV=production
   ```

4. **Деплой:**
   - Vercel автоматически деплоит при каждом push в `main` ветку
   - Каждый PR создает preview деплой

### Ручной деплой

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Деплой
vercel --prod
```

## 🔧 Деплой админки на Railway

### 1. Подготовка
```bash
cd admin
npm install
```

### 2. Создание Railway проекта
- Зайдите на [railway.app](https://railway.app)
- Войдите через GitHub
- Создайте новый проект
- Выберите "Deploy from GitHub repo"
- Выберите папку `admin` в вашем репозитории

### 3. Настройка переменных окружения
```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
PORT=3000
```

### 4. Деплой
Railway автоматически деплоит при каждом push в `main` ветку.

## 📊 Мониторинг производительности

### Lighthouse анализ
```bash
npm run analyze
```

### Vercel Analytics
- Включите в настройках проекта
- Получите детальную статистику по Core Web Vitals

## 🔄 Автоматизация деплоя

### GitHub Actions (опционально)

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🌐 Настройка домена

### 1. Покупка домена
- Рекомендую: Namecheap, GoDaddy, или Google Domains

### 2. Настройка DNS
```
A     @     76.76.19.36
CNAME www   cname.vercel-dns.com
```

### 3. Подключение к Vercel
- В настройках проекта добавьте ваш домен
- Vercel автоматически настроит SSL

## 📱 PWA оптимизация

### 1. Проверьте `site.webmanifest`
### 2. Протестируйте установку на мобильных устройствах
### 3. Проверьте offline функциональность

## 🔍 SEO оптимизация

### 1. Проверьте meta теги в `index.html`
### 2. Убедитесь что `sitemap.xml` актуален
### 3. Проверьте `robots.txt`

## 🚨 Безопасность

### 1. Обновите пароли по умолчанию
### 2. Используйте HTTPS везде
### 3. Настройте CSP заголовки
### 4. Регулярно обновляйте зависимости

## 📈 Масштабирование

### 1. **CDN**: Vercel автоматически обеспечивает глобальный CDN
### 2. **Кэширование**: Настроено в `vercel.json`
### 3. **Мониторинг**: Vercel Analytics + Railway logs
### 4. **Резервные копии**: Автоматические в GitHub

## 🆘 Устранение неполадок

### Проблемы с деплоем
```bash
# Проверьте логи
vercel logs

# Пересоберите проект
npm run build
```

### Проблемы с производительностью
```bash
# Анализ Lighthouse
npm run analyze

# Проверьте размер изображений
du -sh assets/images/
```

## 📞 Поддержка

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Railway**: [railway.app/docs](https://railway.app/docs)
- **GitHub**: Issues в вашем репозитории

---

**Удачи с деплоем! 🎉**
