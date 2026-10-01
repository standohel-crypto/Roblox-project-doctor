# Вход через Google

Кнопка Google появляется активной только после настройки OAuth на сервере.

1. В Google Cloud Console создай OAuth Client ID типа **Web application**.
2. Добавь в Authorized redirect URIs точный адрес:

   `https://ТВОЙ-ДОМЕН/api/auth/google/callback`

3. На Render добавь переменные:

   `GOOGLE_CLIENT_ID` — Client ID из Google Cloud  
   `GOOGLE_CLIENT_SECRET` — Client Secret  
   `PUBLIC_URL` — публичный адрес сайта, например `https://roblox-project-doctor.onrender.com`

4. Передеплой сервис. Локально можно использовать `PUBLIC_URL=http://localhost:3005` и локальный redirect URI.

OAuth использует authorization code, PKCE, state, nonce и проверку ID token. Секрет Google не попадает в браузер. Пользователь связывается с аккаунтом по стабильному Google `sub`, а не по email.

Если Google OAuth ещё не настроен, обычная регистрация по логину продолжает работать, а кнопка показывает понятное состояние недоступности.
